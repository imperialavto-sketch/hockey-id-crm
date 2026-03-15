"use client";

import { useRef } from "react";
import { Button } from "@/components/Button";
import { FileDown } from "lucide-react";

export function PassportPDFExport({
  contentRef,
  fileName = "passport",
}: {
  contentRef: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}) {
  const handleExport = async () => {
    if (!contentRef?.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0f172a",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`${fileName}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("Ошибка экспорта PDF. Убедитесь, что установлены пакеты: jspdf, html2canvas");
    }
  };

  return (
    <Button variant="secondary" onClick={handleExport} className="gap-2">
      <FileDown className="h-4 w-4" />
      Скачать паспорт PDF
    </Button>
  );
}
