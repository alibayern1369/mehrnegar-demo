"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { I } from "./icons";
import { normalizeBarcode } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

/** 1D retail barcodes first — matches LabelPrinter CODE128 unit tags */
const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export function CameraBarcodeScanner({ open, onClose, onScan }: Props) {
  const reactId = useId().replace(/:/g, "");
  const readerId = `camera-barcode-${reactId}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [hint, setHint] = useState("بارکد واحد (عدد بلند) را افقی داخل کادر نگه دارید");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;

    let cancelled = false;
    handledRef.current = false;
    setError(null);
    setStarting(true);
    setHint("بارکد واحد (عدد بلند) را افقی داخل کادر نگه دارید");

    const start = async () => {
      try {
        // Wait until the reader node is laid out with real size
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        if (cancelled) return;

        const el = document.getElementById(readerId);
        if (!el || el.clientWidth < 40 || el.clientHeight < 40) {
          throw new Error("ناحیه اسکن آماده نشد");
        }

        // Force ZXing decoder: Safari BarcodeDetector often misses CODE128 labels
        const scanner = new Html5Qrcode(readerId, {
          verbose: false,
          formatsToSupport: BARCODE_FORMATS,
          useBarCodeDetectorIfSupported: false,
        });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        const backCam =
          cameras.find((c) => /back|rear|environment|خلفی|پشت/i.test(c.label)) ??
          cameras[cameras.length - 1];

        const cameraConfig = backCam?.id
          ? backCam.id
          : { facingMode: { ideal: "environment" } };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            // Wide short box — CODE128 is horizontal, not square like QR
            qrbox: (viewW, viewH) => {
              const width = Math.max(180, Math.floor(viewW * 0.92));
              const height = Math.max(80, Math.min(Math.floor(viewH * 0.28), Math.floor(width * 0.4)));
              return { width, height };
            },
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              // @ts-expect-error — not in all TS lib DOM typings; browsers may honor it
              focusMode: "continuous",
            },
          },
          (decoded) => {
            if (handledRef.current) return;
            const code = normalizeBarcode(decoded);
            if (!code || code.length < 4) return;
            handledRef.current = true;
            setHint(`خوانده شد: ${code}`);
            onScanRef.current(code);
            onCloseRef.current();
          },
          () => {},
        );

        if (cancelled) {
          await scanner.stop().catch(() => {});
          scanner.clear();
          return;
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (/NotAllowedError|Permission|denied/i.test(msg)) {
          setError("دسترسی به دوربین داده نشد. در تنظیمات Safari اجازه دوربین را فعال کنید.");
        } else if (/NotFoundError|DevicesNotFound|Requested device not found/i.test(msg)) {
          setError("دوربینی روی این دستگاه پیدا نشد.");
        } else if (/secure|https|Only secure origins/i.test(msg)) {
          setError("برای اسکن دوربین باید سایت روی HTTPS باز باشد.");
        } else {
          setError("راه‌اندازی دوربین ممکن نبود. بارکد واحد را دستی وارد کنید یا از فایل عکس اسکن کنید.");
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) return;
      const stop = async () => {
        try {
          if (scanner.isScanning) await scanner.stop();
        } catch { /* ignore */ }
        try { scanner.clear(); } catch { /* ignore */ }
      };
      void stop();
    };
  }, [open, mounted, readerId]);

  const scanFromFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setHint("در حال خواندن از عکس…");
    try {
      // Temporary off-DOM decoder so we don't fight the live camera instance
      const tempId = `${readerId}-file`;
      let host = document.getElementById(tempId);
      if (!host) {
        host = document.createElement("div");
        host.id = tempId;
        host.style.display = "none";
        document.body.appendChild(host);
      }
      const decoder = new Html5Qrcode(tempId, {
        verbose: false,
        formatsToSupport: BARCODE_FORMATS,
        useBarCodeDetectorIfSupported: false,
      });
      const decoded = await decoder.scanFile(file, false);
      try { decoder.clear(); } catch { /* ignore */ }
      host.remove();
      const code = normalizeBarcode(decoded);
      if (!code) {
        setError("در این عکس بارکدی پیدا نشد. نزدیک‌تر و واضح‌تر عکس بگیرید.");
        return;
      }
      handledRef.current = true;
      onScanRef.current(code);
      onCloseRef.current();
    } catch {
      setError("بارکد در عکس پیدا نشد. برچسب چاپ‌شده واحد (عدد بلند) را امتحان کنید.");
      setHint("بارکد واحد (عدد بلند) را افقی داخل کادر نگه دارید");
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex flex-col bg-black anim-fade-in" style={{ height: "100dvh" }}>
      <div className="flex shrink-0 items-center gap-3 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onClose}
          className="press rounded-2xl bg-white/12 p-2.5 hover:bg-white/20"
          aria-label="بستن"
        >
          <I.close width={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold">اسکن بارکد واحد</p>
          <p className="text-xs text-white/60">{hint}</p>
        </div>
        <label className="press shrink-0 cursor-pointer rounded-2xl bg-white/12 px-3 py-2 text-xs font-semibold hover:bg-white/20">
          از عکس
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void scanFromFile(f);
            }}
          />
        </label>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <div
          id={readerId}
          className="h-full w-full overflow-hidden [&_img]:hidden [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover"
        />
        {starting && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-white">
            در حال باز کردن دوربین…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
            <p className="text-sm leading-7 text-white/85">{error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <label className="press cursor-pointer rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white">
                انتخاب عکس
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void scanFromFile(f);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onClose}
                className="press rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white"
              >
                بستن
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-1 px-4 py-3 text-center text-[11px] leading-5 text-white/55">
        <p>برچسب چاپ‌شده واحد را اسکن کنید (عدد مثل ۲۸۰۰۰۰۰۰۰۱۰۰۱) — نه بارکد محصول با حرف P</p>
        <p>نور کافی، فاصله نزدیک، و بارکد را افقی داخل نوار باریک وسط نگه دارید</p>
      </div>
    </div>,
    document.body,
  );
}
