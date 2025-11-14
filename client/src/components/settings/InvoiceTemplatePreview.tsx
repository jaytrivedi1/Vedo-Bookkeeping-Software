import { useQuery } from "@tanstack/react-query";
import type { SelectCompany } from "@shared/schema";

interface InvoiceTemplatePreviewProps {
  template: string;
}

export default function InvoiceTemplatePreview({ template }: InvoiceTemplatePreviewProps) {
  const { data: company } = useQuery<SelectCompany>({
    queryKey: ["/api/companies/default"],
  });

  const addressParts = company?.address ? company.address.split(',') : [];
  const sampleData = {
    invoiceNumber: "INV-001",
    date: "January 15, 2025",
    dueDate: "February 14, 2025",
    companyName: company?.name || "Your Company",
    companyAddress: addressParts[0] || "123 Business Street",
    companyCityState: addressParts.length > 1 ? addressParts.slice(1).join(',').trim() : "City, State 12345",
    companyEmail: company?.email || "contact@yourcompany.com",
    companyPhone: company?.phone || "(555) 123-4567",
    companyLogo: company?.logoUrl || null,
    customerName: "Acme Corporation",
    customerAddress: "456 Client Avenue",
    customerCityState: "Client City, State 67890",
    items: [
      { description: "Professional Services - Consultation", quantity: 10, rate: 150, amount: 1500 },
      { description: "Web Development", quantity: 20, rate: 120, amount: 2400 },
      { description: "Design Work", quantity: 5, rate: 100, amount: 500 },
    ],
    subtotal: 4400,
    tax: 352,
    total: 4752,
  };

  const renderClassicTemplate = () => (
    <div className="bg-white p-10 border-2 border-gray-400 shadow-sm">
      {/* Traditional Header: Invoice left, Company right */}
      <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-gray-400">
        <div>
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">INVOICE</h1>
          <div className="text-gray-600">
            <div className="font-semibold">Invoice #: {sampleData.invoiceNumber}</div>
            <div className="mt-1">Date: {sampleData.date}</div>
            <div>Due Date: {sampleData.dueDate}</div>
          </div>
        </div>
        <div className="text-right">
          {sampleData.companyLogo && (
            <div className="mb-3 flex justify-end">
              <img 
                src={sampleData.companyLogo} 
                alt={sampleData.companyName}
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          <div className="font-bold text-lg text-gray-900">{sampleData.companyName}</div>
          <div className="text-sm text-gray-600 mt-2">
            <div>{sampleData.companyAddress}</div>
            <div>{sampleData.companyCityState}</div>
            <div className="mt-2">{sampleData.companyEmail}</div>
            <div>{sampleData.companyPhone}</div>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="mb-8">
        <div className="text-xs font-bold uppercase text-gray-600 mb-2">Bill To</div>
        <div className="text-gray-800">
          <div className="font-bold text-base">{sampleData.customerName}</div>
          <div className="text-sm mt-1">{sampleData.customerAddress}</div>
          <div className="text-sm">{sampleData.customerCityState}</div>
        </div>
      </div>

      {/* Line Items - Full Border Table */}
      <table className="w-full border-2 border-gray-400 mb-8">
        <thead>
          <tr className="bg-gray-200 border-b-2 border-gray-400">
            <th className="text-left py-3 px-4 font-bold text-sm text-gray-800 border-r border-gray-400">Description</th>
            <th className="text-center py-3 px-3 font-bold text-sm text-gray-800 border-r border-gray-400">Qty</th>
            <th className="text-right py-3 px-3 font-bold text-sm text-gray-800 border-r border-gray-400">Rate</th>
            <th className="text-right py-3 px-4 font-bold text-sm text-gray-800">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-400">
              <td className="py-3 px-4 text-gray-700 border-r border-gray-400">{item.description}</td>
              <td className="py-3 px-3 text-center text-gray-700 border-r border-gray-400">{item.quantity}</td>
              <td className="py-3 px-3 text-right text-gray-700 border-r border-gray-400">${item.rate.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-gray-700">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Box - Right Aligned */}
      <div className="flex justify-end">
        <div className="w-72 border-2 border-gray-400">
          <div className="flex justify-between py-2 px-4 border-b border-gray-400">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span className="text-gray-700">${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 px-4 border-b border-gray-400">
            <span className="font-semibold text-gray-700">Tax (8%):</span>
            <span className="text-gray-700">${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 px-4 bg-gray-800 text-white font-bold text-lg">
            <span>Total:</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-gray-400 text-center text-sm text-gray-600">
        <p className="font-serif italic">Thank you for your business!</p>
      </div>
    </div>
  );

  const renderModernTemplate = () => (
    <div className="bg-white shadow-xl">
      {/* Full-Width Colored Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-10 py-8 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            {sampleData.companyLogo && (
              <img 
                src={sampleData.companyLogo} 
                alt={sampleData.companyName}
                className="h-16 w-auto object-contain bg-white rounded px-2 py-1"
              />
            )}
            <div>
              <h1 className="text-5xl font-black tracking-tight">INVOICE</h1>
              <div className="text-blue-100 mt-2 text-lg">#{sampleData.invoiceNumber}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{sampleData.companyName}</div>
            <div className="text-blue-100 text-sm mt-1">{sampleData.companyEmail}</div>
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        {/* Info Cards Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-bold uppercase text-blue-600 mb-2">Bill To</div>
            <div className="font-bold text-gray-900">{sampleData.customerName}</div>
            <div className="text-sm text-gray-600 mt-1">{sampleData.customerAddress}</div>
            <div className="text-sm text-gray-600">{sampleData.customerCityState}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-bold uppercase text-blue-600 mb-2">Issue Date</div>
            <div className="font-semibold text-gray-900 text-lg">{sampleData.date}</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-xs font-bold uppercase text-blue-600 mb-2">Due Date</div>
            <div className="font-semibold text-gray-900 text-lg">{sampleData.dueDate}</div>
          </div>
        </div>

        {/* Borderless Table with Stripes */}
        <div className="mb-6">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 bg-blue-50 px-4 py-3 rounded-t-lg font-bold text-sm text-blue-900">
            <div>Description</div>
            <div className="text-center">Quantity</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>
          {sampleData.items.map((item, index) => (
            <div 
              key={index} 
              className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-4 ${
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

        {/* Prominent Total Section */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="flex justify-between py-3 px-4 text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">${sampleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 px-4 text-gray-700 border-t border-gray-200">
              <span>Tax (8%)</span>
              <span className="font-semibold">${sampleData.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-4 px-6 mt-2 bg-blue-600 text-white rounded-lg text-xl font-bold">
              <span>Total Due</span>
              <span>${sampleData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Thank you for choosing {sampleData.companyName}</p>
        </div>
      </div>
    </div>
  );

  const renderMinimalTemplate = () => (
    <div className="bg-white p-12">
      {/* Centered Minimal Header */}
      <div className="text-center mb-12">
        {sampleData.companyLogo && (
          <div className="flex justify-center mb-6">
            <img 
              src={sampleData.companyLogo} 
              alt={sampleData.companyName}
              className="h-14 w-auto object-contain"
            />
          </div>
        )}
        <h1 className="text-3xl font-light tracking-widest text-gray-900 mb-4">INVOICE</h1>
        <div className="text-gray-500 text-sm">{sampleData.invoiceNumber}</div>
      </div>

      {/* Centered Company Info */}
      <div className="text-center mb-10 text-gray-600 text-sm space-y-1">
        <div className="font-medium text-gray-800">{sampleData.companyName}</div>
        <div>{sampleData.companyAddress} · {sampleData.companyCityState}</div>
        <div>{sampleData.companyEmail} · {sampleData.companyPhone}</div>
      </div>

      <div className="h-px bg-gray-300 mb-10"></div>

      {/* Bill To and Dates - Centered Layout */}
      <div className="max-w-md mx-auto mb-12 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Client</div>
          <div className="text-gray-800 font-medium">{sampleData.customerName}</div>
          <div className="text-sm text-gray-600 mt-1">{sampleData.customerAddress}</div>
          <div className="text-sm text-gray-600">{sampleData.customerCityState}</div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Issue Date</div>
            <div className="text-gray-800">{sampleData.date}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Due Date</div>
            <div className="text-gray-800">{sampleData.dueDate}</div>
          </div>
        </div>
      </div>

      {/* Line Items - No Table, Just Rows */}
      <div className="space-y-4 mb-10">
        {sampleData.items.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="text-gray-800 font-medium">{item.description}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {item.quantity} × ${item.rate.toFixed(2)}
                </div>
              </div>
              <div className="text-gray-900 font-semibold ml-8">${item.amount.toFixed(2)}</div>
            </div>
            {index < sampleData.items.length - 1 && (
              <div className="h-px bg-gray-200 mt-4"></div>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-300 mb-8"></div>

      {/* Totals - Clean Typography */}
      <div className="max-w-sm ml-auto space-y-3">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>${sampleData.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Tax</span>
          <span>${sampleData.tax.toFixed(2)}</span>
        </div>
        <div className="h-px bg-gray-300 my-4"></div>
        <div className="flex justify-between text-2xl font-light text-gray-900">
          <span>Total</span>
          <span>${sampleData.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="mt-16 text-center text-xs text-gray-400 tracking-wide">
        THANK YOU
      </div>
    </div>
  );

  const renderCompactTemplate = () => (
    <div className="bg-white p-6 border border-gray-400">
      {/* Two-Column Header */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-4 border-b border-gray-400">
        <div className="flex gap-3">
          {sampleData.companyLogo && (
            <img 
              src={sampleData.companyLogo} 
              alt={sampleData.companyName}
              className="h-10 w-auto object-contain"
            />
          )}
          <div>
            <div className="font-bold text-base text-gray-900 mb-1">{sampleData.companyName}</div>
            <div className="text-xs text-gray-600 leading-tight">
              <div>{sampleData.companyAddress}</div>
              <div>{sampleData.companyCityState}</div>
              <div className="mt-1">{sampleData.companyEmail}</div>
              <div>{sampleData.companyPhone}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
          <div className="text-xs text-gray-600 space-y-0.5">
            <div><span className="font-semibold">No:</span> {sampleData.invoiceNumber}</div>
            <div><span className="font-semibold">Date:</span> {sampleData.date}</div>
            <div><span className="font-semibold">Due:</span> {sampleData.dueDate}</div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Customer Info */}
      <div className="mb-5">
        <div className="text-xs font-bold text-gray-700 mb-1">BILL TO</div>
        <div className="text-xs text-gray-800">
          <div className="font-semibold">{sampleData.customerName}</div>
          <div className="mt-0.5">{sampleData.customerAddress}, {sampleData.customerCityState}</div>
        </div>
      </div>

      {/* Condensed Table */}
      <table className="w-full text-xs mb-4 border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="text-left py-2 px-2 font-bold text-gray-800 border-b border-gray-300">Description</th>
            <th className="text-center py-2 px-2 font-bold text-gray-800 border-b border-gray-300 w-16">Qty</th>
            <th className="text-right py-2 px-2 font-bold text-gray-800 border-b border-gray-300 w-20">Rate</th>
            <th className="text-right py-2 px-2 font-bold text-gray-800 border-b border-gray-300 w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sampleData.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">{item.description}</td>
              <td className="py-2 px-2 text-center text-gray-700">{item.quantity}</td>
              <td className="py-2 px-2 text-right text-gray-700">${item.rate.toFixed(2)}</td>
              <td className="py-2 px-2 text-right text-gray-700 font-semibold">${item.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Compact Totals */}
      <div className="flex justify-end">
        <div className="w-48 text-xs">
          <div className="flex justify-between py-1.5 px-2 bg-gray-100">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span className="text-gray-700">${sampleData.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-2 bg-gray-100 border-t border-gray-300">
            <span className="font-semibold text-gray-700">Tax (8%):</span>
            <span className="text-gray-700">${sampleData.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 px-2 bg-gray-700 text-white font-bold text-sm mt-1">
            <span>TOTAL:</span>
            <span>${sampleData.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Compact Footer */}
      <div className="mt-4 pt-3 border-t border-gray-300 text-center text-xs text-gray-500">
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
    <div className="bg-gray-100 p-6 rounded-lg max-h-[calc(80vh-200px)] overflow-y-auto">
      {renderTemplate()}
    </div>
  );
}
