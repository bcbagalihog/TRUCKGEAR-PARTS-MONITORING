import { cn } from "@/lib/utils";

type StatusType = "draft" | "shipped" | "invoiced" | "ordered" | "received" | "unpaid" | "partial" | "paid" | string;

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    unpaid: "bg-red-50 text-red-700 border-red-200",
    shipped: "bg-blue-50 text-blue-700 border-blue-200",
    ordered: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    invoiced: "bg-green-50 text-green-700 border-green-200",
    received: "bg-green-50 text-green-700 border-green-200",
    paid: "bg-green-50 text-green-700 border-green-200",
  };

  const style = variants[status.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span className={cn("status-badge border", style, className)}>
      {status}
    </span>
  );
}
