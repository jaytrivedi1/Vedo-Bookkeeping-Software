interface InvoiceTemplatePreviewProps {
  template: string;
}

export default function InvoiceTemplatePreview({ template }: InvoiceTemplatePreviewProps) {
  // Sample data for preview
  const sampleData = {
    invoiceNumber: "INV-001",
    date: "January 15, 2025",
    dueDate: "February 14, 2025",
    companyName: "Your Company",
    companyAddress: "123 Business Street",
    companyCityState: "City, State 12345",
    companyEmail: "contact@yourcompany.com",
    companyPhone: "(555) 123-4567",
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

  // Different template styles
  const getTemplateStyles = () => {
    switch (template) {
      case 'modern':
        return {
          containerClass: "bg-white p-8 rounded-lg shadow-lg border-l-4 border-primary",
          headerClass: "mb-8 pb-6 border-b-2 border-primary",
          titleClass: "text-4xl font-black text-gray-900 tracking-tight",
          companyClass: "text-right text-sm",
          companyNameClass: "font-bold text-lg text-primary",
          sectionTitleClass: "text-xs font-bold uppercase tracking-wider text-primary mb-2",
          tableHeaderClass: "bg-primary text-white font-semibold text-sm",
          totalClass: "bg-primary text-white font-bold text-lg",
        };
      case 'minimal':
        return {
          containerClass: "bg-white p-8 border border-gray-300",
          headerClass: "mb-6 pb-4 border-b border-gray-300",
          titleClass: "text-2xl font-light text-gray-800 tracking-wide",
          companyClass: "text-right text-sm text-gray-600",
          companyNameClass: "font-medium text-base text-gray-800",
          sectionTitleClass: "text-xs font-medium uppercase text-gray-500 mb-2",
          tableHeaderClass: "bg-gray-100 text-gray-700 font-medium text-sm",
          totalClass: "bg-gray-800 text-white font-semibold",
        };
      case 'compact':
        return {
          containerClass: "bg-white p-6 border-2 border-gray-400",
          headerClass: "mb-4",
          titleClass: "text-xl font-bold text-gray-900",
          companyClass: "text-right text-xs",
          companyNameClass: "font-semibold text-sm text-gray-800",
          sectionTitleClass: "text-xs font-semibold text-gray-700 mb-1",
          tableHeaderClass: "bg-gray-200 text-gray-800 font-semibold text-xs",
          totalClass: "bg-gray-700 text-white font-bold text-sm",
        };
      default: // classic
        return {
          containerClass: "bg-white p-8 border border-gray-400 shadow-sm",
          headerClass: "mb-8 pb-4 border-b border-gray-400",
          titleClass: "text-3xl font-serif font-bold text-gray-800",
          companyClass: "text-right text-sm text-gray-700",
          companyNameClass: "font-bold text-base text-gray-800",
          sectionTitleClass: "text-xs font-bold uppercase text-gray-600 mb-2",
          tableHeaderClass: "bg-gray-200 text-gray-800 font-bold text-sm border-b-2 border-gray-400",
          totalClass: "bg-gray-800 text-white font-bold",
        };
    }
  };

  const styles = getTemplateStyles();

  return (
    <div className="bg-gray-100 p-6 rounded-lg max-h-[calc(80vh-200px)] overflow-y-auto">
      <div className={styles.containerClass}>
        {/* Header */}
        <div className={styles.headerClass}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className={styles.titleClass}>INVOICE</h1>
              <p className="text-gray-600 text-sm mt-1">#{sampleData.invoiceNumber}</p>
            </div>
            <div className={styles.companyClass}>
              <div className={styles.companyNameClass}>{sampleData.companyName}</div>
              <div className="mt-1">{sampleData.companyAddress}</div>
              <div>{sampleData.companyCityState}</div>
              <div className="mt-1">{sampleData.companyEmail}</div>
              <div>{sampleData.companyPhone}</div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className={styles.sectionTitleClass}>Bill To</div>
            <div className="text-gray-700">
              <div className="font-semibold">{sampleData.customerName}</div>
              <div className="text-sm mt-1">{sampleData.customerAddress}</div>
              <div className="text-sm">{sampleData.customerCityState}</div>
            </div>
          </div>
          <div>
            <div className={styles.sectionTitleClass}>Invoice Details</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">Issue Date:</span>
                <span>{sampleData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due Date:</span>
                <span>{sampleData.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-6">
          <table className="w-full">
            <thead>
              <tr className={styles.tableHeaderClass}>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-right py-3 px-4">Rate</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-700">{item.description}</td>
                  <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-700">${item.rate.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-700">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 text-gray-700">
              <span>Subtotal:</span>
              <span>${sampleData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-gray-700 border-b border-gray-300">
              <span>Tax (8%):</span>
              <span>${sampleData.tax.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between py-3 px-4 mt-2 ${styles.totalClass}`}>
              <span>Total:</span>
              <span>${sampleData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
          <p>Thank you for your business!</p>
          <p className="mt-1">Payment is due within 30 days</p>
        </div>
      </div>
    </div>
  );
}
