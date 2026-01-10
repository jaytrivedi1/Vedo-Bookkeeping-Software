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
        const containerWidth = containerRef.current.offsetWidth - 48;
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

  // PROFESSIONAL TEMPLATE - Clean corporate style
  const renderProfessionalTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 48 }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
          {sampleData.companyLogo && (
            <img
              src={sampleData.companyLogo}
              alt={sampleData.companyName}
              className="h-12 w-auto object-contain"
            />
          )}
          <div>
            <div className="text-xl font-semibold text-gray-900">{sampleData.companyName}</div>
            <div className="text-sm text-gray-500 mt-1">
              {sampleData.companyAddress}, {sampleData.companyCityState}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</div>
          <div className="text-sm text-gray-500 mt-2 space-y-0.5">
            <div><span className="text-gray-400">No.</span> {sampleData.invoiceNumber}</div>
            <div><span className="text-gray-400">Date:</span> {sampleData.date}</div>
            <div><span className="text-gray-400">Due:</span> {sampleData.dueDate}</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 mb-8"></div>

      {/* Bill To */}
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Bill To</div>
        <div className="text-gray-900">
          <div className="font-semibold">{sampleData.customerName}</div>
          <div className="text-sm text-gray-600 mt-1">{sampleData.customerAddress}</div>
          <div className="text-sm text-gray-600">{sampleData.customerCityState}</div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-8">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-3 border-b-2 border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <div>Description</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Rate</div>
          <div className="text-right">Amount</div>
        </div>
        {sampleData.items.map((item, index) => (
          <div
            key={index}
            className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-3 text-sm ${
              index % 2 === 1 ? 'bg-gray-50 -mx-2 px-2' : ''
            }`}
          >
            <div className="text-gray-800">{item.description}</div>
            <div className="text-center text-gray-600">{item.quantity}</div>
            <div className="text-right text-gray-600">${item.rate.toFixed(2)}</div>
            <div className="text-right text-gray-900 font-medium">${item.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-2 text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
            <span>Tax (8%)</span>
            <span>${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 text-lg font-semibold text-gray-900">
            <span>Total</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-12">
        <div className="h-px bg-gray-100 mb-4"></div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{sampleData.companyEmail}</span>
          <span>{sampleData.companyPhone}</span>
        </div>
      </div>
    </div>
  );

  // BOLD TEMPLATE - Strong visual hierarchy
  const renderBoldTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT }}>
      {/* Accent Bar */}
      <div className="h-2 bg-gray-900"></div>

      <div style={{ padding: 48 }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</div>
            <div className="flex gap-3 mt-4">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                {sampleData.invoiceNumber}
              </span>
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                Due: {sampleData.dueDate}
              </span>
            </div>
          </div>
          <div className="text-right">
            {sampleData.companyLogo && (
              <img
                src={sampleData.companyLogo}
                alt={sampleData.companyName}
                className="h-10 w-auto object-contain ml-auto mb-2"
              />
            )}
            <div className="font-bold text-gray-900">{sampleData.companyName}</div>
            <div className="text-xs text-gray-500 mt-1">
              <div>{sampleData.companyAddress}</div>
              <div>{sampleData.companyCityState}</div>
            </div>
          </div>
        </div>

        {/* Two Column Info */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Billed To</div>
            <div className="font-semibold text-gray-900">{sampleData.customerName}</div>
            <div className="text-sm text-gray-600 mt-1">
              <div>{sampleData.customerAddress}</div>
              <div>{sampleData.customerCityState}</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Invoice Details</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Issue Date</span>
                <span className="font-medium text-gray-900">{sampleData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date</span>
                <span className="font-medium text-gray-900">{sampleData.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-3 bg-gray-900 text-white rounded-t-lg px-4 text-xs font-bold uppercase tracking-wider">
            <div>Description</div>
            <div className="text-center">Qty</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>
          {sampleData.items.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-4 px-4 text-sm border-b border-gray-100 ${
                index % 2 === 1 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="font-medium text-gray-800">{item.description}</div>
              <div className="text-center text-gray-600">{item.quantity}</div>
              <div className="text-right text-gray-600">${item.rate.toFixed(2)}</div>
              <div className="text-right font-semibold text-gray-900">${item.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2 text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${sampleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm text-gray-600">
              <span>Tax (8%)</span>
              <span>${sampleData.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-4 mt-2 bg-gray-900 text-white rounded-lg px-4 text-lg font-bold">
              <span>Total Due</span>
              <span>${sampleData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-400">
          Thank you for your business
        </div>
      </div>
    </div>
  );

  // ELEGANT TEMPLATE - Refined, premium feel
  const renderElegantTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 56 }}>
      {/* Header */}
      <div className="text-center mb-12">
        {sampleData.companyLogo && (
          <div className="flex justify-center mb-4">
            <img
              src={sampleData.companyLogo}
              alt={sampleData.companyName}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
        <div className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-2">{sampleData.companyName}</div>
        <div className="text-3xl font-light text-gray-800 tracking-wide">Invoice</div>
        <div className="text-sm text-gray-400 mt-2">{sampleData.invoiceNumber}</div>
      </div>

      {/* Thin Divider */}
      <div className="h-px bg-gray-200 mb-10"></div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div>
          <div className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-3">Billed To</div>
          <div className="text-gray-800">
            <div className="font-medium">{sampleData.customerName}</div>
            <div className="text-sm text-gray-500 mt-2 leading-relaxed">
              {sampleData.customerAddress}<br />
              {sampleData.customerCityState}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-3">Details</div>
          <div className="text-sm text-gray-600 space-y-2">
            <div>
              <span className="text-gray-400">Date </span>
              <span className="text-gray-800">{sampleData.date}</span>
            </div>
            <div>
              <span className="text-gray-400">Due </span>
              <span className="text-gray-800">{sampleData.dueDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-10">
        <div className="flex justify-between py-3 border-b border-gray-200 text-xs tracking-[0.15em] text-gray-400 uppercase">
          <span>Description</span>
          <span>Amount</span>
        </div>
        {sampleData.items.map((item, index) => (
          <div key={index} className="flex justify-between py-4 border-b border-gray-100">
            <div>
              <div className="text-gray-800">{item.description}</div>
              <div className="text-xs text-gray-400 mt-1">
                {item.quantity} × ${item.rate.toFixed(2)}
              </div>
            </div>
            <div className="text-gray-800 font-medium">${item.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Totals with dotted leader */}
      <div className="max-w-xs ml-auto">
        <div className="flex items-end justify-between py-2 text-sm">
          <span className="text-gray-400">Subtotal</span>
          <span className="flex-1 border-b border-dotted border-gray-200 mx-4 mb-1"></span>
          <span className="text-gray-600">${sampleData.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-end justify-between py-2 text-sm">
          <span className="text-gray-400">Tax</span>
          <span className="flex-1 border-b border-dotted border-gray-200 mx-4 mb-1"></span>
          <span className="text-gray-600">${sampleData.tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-gray-200 my-3"></div>
        <div className="flex items-end justify-between py-2">
          <span className="text-gray-800 font-medium">Total</span>
          <span className="flex-1 border-b border-dotted border-gray-200 mx-4 mb-1"></span>
          <span className="text-xl text-gray-900">${sampleData.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <div className="text-xs tracking-[0.2em] text-gray-300 uppercase">Thank You</div>
      </div>

      {/* Contact Footer */}
      <div className="mt-auto pt-8">
        <div className="h-px bg-gray-100 mb-4"></div>
        <div className="text-center text-xs text-gray-400">
          {sampleData.companyEmail} · {sampleData.companyPhone}
        </div>
      </div>
    </div>
  );

  // SIMPLE TEMPLATE - Clean and functional
  const renderSimpleTemplate = () => (
    <div className="bg-white" style={{ width: PAPER_WIDTH, minHeight: PAPER_HEIGHT, padding: 48 }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Invoice</div>
          <div className="text-sm text-gray-500 mt-1">{sampleData.invoiceNumber}</div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div className="font-medium text-gray-900">{sampleData.companyName}</div>
          <div className="mt-1">{sampleData.companyAddress}</div>
          <div>{sampleData.companyCityState}</div>
          <div className="mt-2">{sampleData.companyEmail}</div>
        </div>
      </div>

      {/* Dates Row */}
      <div className="flex gap-8 mb-8 text-sm">
        <div>
          <span className="text-gray-400">Date: </span>
          <span className="text-gray-700">{sampleData.date}</span>
        </div>
        <div>
          <span className="text-gray-400">Due: </span>
          <span className="text-gray-700">{sampleData.dueDate}</span>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Bill To</div>
        <div className="text-gray-800 font-medium">{sampleData.customerName}</div>
        <div className="text-sm text-gray-600 mt-1">
          {sampleData.customerAddress}, {sampleData.customerCityState}
        </div>
      </div>

      {/* Simple Table */}
      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 font-medium text-gray-500">Description</th>
            <th className="text-center py-3 font-medium text-gray-500 w-20">Qty</th>
            <th className="text-right py-3 font-medium text-gray-500 w-24">Rate</th>
            <th className="text-right py-3 font-medium text-gray-500 w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-50">
              <td className="py-3 text-gray-800">{item.description}</td>
              <td className="py-3 text-center text-gray-600">{item.quantity}</td>
              <td className="py-3 text-right text-gray-600">${item.rate.toFixed(2)}</td>
              <td className="py-3 text-right text-gray-800">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-56 text-sm">
          <div className="flex justify-between py-2 text-gray-600">
            <span>Subtotal</span>
            <span>${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 text-gray-600">
            <span>Tax (8%)</span>
            <span>${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 border-t border-gray-200 font-semibold text-gray-900">
            <span>Total</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
        Payment due within 30 days · {sampleData.companyPhone}
      </div>
    </div>
  );

  const renderTemplate = () => {
    switch (template) {
      case 'bold':
        return renderBoldTemplate();
      case 'elegant':
        return renderElegantTemplate();
      case 'simple':
        return renderSimpleTemplate();
      default:
        return renderProfessionalTemplate();
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
