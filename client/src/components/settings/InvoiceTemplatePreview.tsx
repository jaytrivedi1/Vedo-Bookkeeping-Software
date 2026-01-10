import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useEffect } from "react";
import type { Company } from "@shared/schema";

interface InvoiceTemplatePreviewProps {
  template: string;
}

// Standard US Letter size aspect ratio (8.5 x 11 inches)
const PAPER_WIDTH = 612; // points (8.5 * 72)
const PAPER_HEIGHT = 792; // points (11 * 72)

export default function InvoiceTemplatePreview({ template }: InvoiceTemplatePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies/default"],
  });

  // Calculate scale factor based on container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth - 48; // Account for padding
        const newScale = Math.min(containerWidth / PAPER_WIDTH, 0.65);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Build address from company fields
  const companyAddress = company?.street1 || "123 Business Street";
  const companyCityState = [company?.city, company?.state, company?.postalCode]
    .filter(Boolean)
    .join(', ') || "City, State 12345";

  const sampleData = {
    invoiceNumber: "INV-001",
    date: "January 15, 2025",
    dueDate: "February 14, 2025",
    companyName: company?.name || "Your Company",
    companyAddress,
    companyCityState,
    companyEmail: company?.email || "contact@yourcompany.com",
    companyPhone: company?.phone || "(555) 123-4567",
    companyLogo: company?.logoUrl || null,
    customerName: "Acme Corporation",
    customerAddress: "456 Client Avenue",
    customerCityState: "Client City, State 67890",
    items: [
      { description: "Professional Services", quantity: 10, rate: 150, amount: 1500 },
      { description: "Web Development", quantity: 20, rate: 120, amount: 2400 },
      { description: "Design Work", quantity: 5, rate: 100, amount: 500 },
    ],
    subtotal: 4400,
    tax: 352,
    total: 4752,
  };

  const renderClassicTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 48 }}>
      {/* Traditional Header */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-400">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">INVOICE</h1>
          <div className="text-sm text-gray-600">
            <div className="font-semibold">Invoice #: {sampleData.invoiceNumber}</div>
            <div className="mt-1">Date: {sampleData.date}</div>
            <div>Due Date: {sampleData.dueDate}</div>
          </div>
        </div>
        <div className="text-right">
          {sampleData.companyLogo && (
            <div className="mb-2 flex justify-end">
              <img
                src={sampleData.companyLogo}
                alt={sampleData.companyName}
                className="h-10 w-auto object-contain"
              />
            </div>
          )}
          <div className="font-bold text-base text-gray-900">{sampleData.companyName}</div>
          <div className="text-xs text-gray-600 mt-1">
            <div>{sampleData.companyAddress}</div>
            <div>{sampleData.companyCityState}</div>
            <div className="mt-1">{sampleData.companyEmail}</div>
            <div>{sampleData.companyPhone}</div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase text-gray-600 mb-1">Bill To</div>
        <div className="text-sm text-gray-800">
          <div className="font-bold">{sampleData.customerName}</div>
          <div>{sampleData.customerAddress}</div>
          <div>{sampleData.customerCityState}</div>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="w-full border border-gray-400 mb-6 text-sm">
        <thead>
          <tr className="bg-gray-200 border-b border-gray-400">
            <th className="text-left py-2 px-3 font-bold text-gray-800">Description</th>
            <th className="text-center py-2 px-2 font-bold text-gray-800 w-16">Qty</th>
            <th className="text-right py-2 px-2 font-bold text-gray-800 w-20">Rate</th>
            <th className="text-right py-2 px-3 font-bold text-gray-800 w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-300">
              <td className="py-2 px-3 text-gray-700">{item.description}</td>
              <td className="py-2 px-2 text-center text-gray-700">{item.quantity}</td>
              <td className="py-2 px-2 text-right text-gray-700">${item.rate.toFixed(2)}</td>
              <td className="py-2 px-3 text-right text-gray-700">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-56 text-sm">
          <div className="flex justify-between py-1.5 px-3 border border-gray-300">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span>${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 border-x border-b border-gray-300">
            <span className="font-semibold text-gray-700">Tax (8%):</span>
            <span>${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 px-3 bg-gray-800 text-white font-bold">
            <span>Total:</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p className="font-serif italic">Thank you for your business!</p>
      </div>
    </div>
  );

  const renderModernTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT }}>
      {/* Colored Header */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-8 py-6 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {sampleData.companyLogo && (
              <img
                src={sampleData.companyLogo}
                alt={sampleData.companyName}
                className="h-12 w-auto object-contain bg-white rounded px-2 py-1"
              />
            )}
            <div>
              <h1 className="text-3xl font-black tracking-tight">INVOICE</h1>
              <div className="text-sky-100 mt-1">#{sampleData.invoiceNumber}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{sampleData.companyName}</div>
            <div className="text-sky-100 text-xs mt-1">{sampleData.companyEmail}</div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs font-bold uppercase text-sky-600 mb-1">Bill To</div>
            <div className="font-bold text-sm text-gray-900">{sampleData.customerName}</div>
            <div className="text-xs text-gray-600 mt-1">{sampleData.customerAddress}</div>
            <div className="text-xs text-gray-600">{sampleData.customerCityState}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs font-bold uppercase text-sky-600 mb-1">Issue Date</div>
            <div className="font-semibold text-sm text-gray-900">{sampleData.date}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs font-bold uppercase text-sky-600 mb-1">Due Date</div>
            <div className="font-semibold text-sm text-gray-900">{sampleData.dueDate}</div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-6 text-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 bg-sky-50 px-3 py-2 rounded-t-lg font-bold text-sky-900">
            <div>Description</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>
          {sampleData.items.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-3 py-2.5 ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="text-gray-700">{item.description}</div>
              <div className="text-center text-gray-700">{item.quantity}</div>
              <div className="text-right text-gray-700">${item.rate.toFixed(2)}</div>
              <div className="text-right text-gray-700 font-semibold">${item.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-2 px-3 text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">${sampleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 px-3 text-gray-700 border-t border-gray-200">
              <span>Tax (8%)</span>
              <span className="font-semibold">${sampleData.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 px-4 mt-2 bg-sky-600 text-white rounded-lg font-bold">
              <span>Total Due</span>
              <span>${sampleData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-400 text-xs">
          <p>Thank you for choosing {sampleData.companyName}</p>
        </div>
      </div>
    </div>
  );

  const renderMinimalTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 56 }}>
      {/* Centered Header */}
      <div className="text-center mb-10">
        {sampleData.companyLogo && (
          <div className="flex justify-center mb-4">
            <img
              src={sampleData.companyLogo}
              alt={sampleData.companyName}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
        <h1 className="text-2xl font-light tracking-widest text-gray-900 mb-2">INVOICE</h1>
        <div className="text-gray-400 text-sm">{sampleData.invoiceNumber}</div>
      </div>

      {/* Company Info */}
      <div className="text-center mb-8 text-gray-600 text-xs space-y-0.5">
        <div className="font-medium text-gray-800">{sampleData.companyName}</div>
        <div>{sampleData.companyAddress} · {sampleData.companyCityState}</div>
        <div>{sampleData.companyEmail} · {sampleData.companyPhone}</div>
      </div>

      <div className="h-px bg-gray-200 mb-8"></div>

      {/* Client & Dates */}
      <div className="max-w-sm mx-auto mb-10 space-y-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Client</div>
          <div className="text-gray-800 font-medium">{sampleData.customerName}</div>
          <div className="text-xs text-gray-600 mt-0.5">{sampleData.customerAddress}</div>
          <div className="text-xs text-gray-600">{sampleData.customerCityState}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Issue Date</div>
            <div className="text-gray-800 text-sm">{sampleData.date}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Due Date</div>
            <div className="text-gray-800 text-sm">{sampleData.dueDate}</div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-3 mb-8 text-sm">
        {sampleData.items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-gray-800 font-medium">{item.description}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.quantity} × ${item.rate.toFixed(2)}
                </div>
              </div>
              <div className="text-gray-900 font-semibold ml-6">${item.amount.toFixed(2)}</div>
            </div>
            {index < sampleData.items.length - 1 && (
              <div className="h-px bg-gray-100 mt-3"></div>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-200 mb-6"></div>

      {/* Totals */}
      <div className="max-w-xs ml-auto space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>${sampleData.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Tax</span>
          <span>${sampleData.tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-gray-200 my-3"></div>
        <div className="flex justify-between text-xl font-light text-gray-900">
          <span>Total</span>
          <span>${sampleData.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-gray-400 tracking-wide">
        THANK YOU
      </div>
    </div>
  );

  const renderCompactTemplate = () => (
    <div className="bg-white border border-gray-300" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 32 }}>
      {/* Two-Column Header */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-gray-300">
        <div className="flex gap-2">
          {sampleData.companyLogo && (
            <img
              src={sampleData.companyLogo}
              alt={sampleData.companyName}
              className="h-8 w-auto object-contain"
            />
          )}
          <div>
            <div className="font-bold text-sm text-gray-900">{sampleData.companyName}</div>
            <div className="text-[10px] text-gray-600 leading-tight">
              <div>{sampleData.companyAddress}</div>
              <div>{sampleData.companyCityState}</div>
              <div>{sampleData.companyEmail}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold text-gray-900 mb-1">INVOICE</h1>
          <div className="text-[10px] text-gray-600 space-y-0.5">
            <div><span className="font-semibold">No:</span> {sampleData.invoiceNumber}</div>
            <div><span className="font-semibold">Date:</span> {sampleData.date}</div>
            <div><span className="font-semibold">Due:</span> {sampleData.dueDate}</div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-gray-700 mb-0.5">BILL TO</div>
        <div className="text-[10px] text-gray-800">
          <div className="font-semibold">{sampleData.customerName}</div>
          <div>{sampleData.customerAddress}, {sampleData.customerCityState}</div>
        </div>
      </div>

      {/* Compact Table */}
      <table className="w-full text-[10px] mb-4 border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-1.5 px-2 font-bold text-gray-800 border-b border-gray-300">Description</th>
            <th className="text-center py-1.5 px-1 font-bold text-gray-800 border-b border-gray-300 w-12">Qty</th>
            <th className="text-right py-1.5 px-1 font-bold text-gray-800 border-b border-gray-300 w-16">Rate</th>
            <th className="text-right py-1.5 px-2 font-bold text-gray-800 border-b border-gray-300 w-20">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-1.5 px-2 text-gray-700">{item.description}</td>
              <td className="py-1.5 px-1 text-center text-gray-700">{item.quantity}</td>
              <td className="py-1.5 px-1 text-right text-gray-700">${item.rate.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right text-gray-700 font-semibold">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Compact Totals */}
      <div className="flex justify-end">
        <div className="w-40 text-[10px]">
          <div className="flex justify-between py-1 px-2 bg-gray-50">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span>${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1 px-2 bg-gray-50 border-t border-gray-200">
            <span className="font-semibold text-gray-700">Tax (8%):</span>
            <span>${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-2 bg-gray-700 text-white font-bold text-xs mt-0.5">
            <span>TOTAL:</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-gray-200 text-center text-[10px] text-gray-500">
        Payment due within 30 days
      </div>
    </div>
  );

  const renderTemplate = () => {
    switch (template) {
      case 'modern':
        return renderModernTemplate();
      case 'minimal':
        return renderMinimalTemplate();
      case 'compact':
        return renderCompactTemplate();
      default:
        return renderClassicTemplate();
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-100 rounded-lg p-6 flex justify-center overflow-hidden"
      style={{ minHeight: 400 }}
    >
      {/* Paper container with scaling */}
      <div
        className="shadow-xl"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: PAPER_WIDTH,
          minHeight: PAPER_HEIGHT,
        }}
      >
        {renderTemplate()}
      </div>
    </div>
  );
}
