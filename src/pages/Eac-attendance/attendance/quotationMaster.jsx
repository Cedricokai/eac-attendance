import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, Plus, Trash } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function QuotationMaster() {
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, price: 0 }]);
  const [notes, setNotes] = useState("");

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Quotation", 14, 20);

    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 14, 30);
    doc.text(`Address: ${customerAddress}`, 14, 36);

    const tableData = items.map((i) => [i.description, i.quantity, i.price, i.quantity * i.price]);

    doc.autoTable({
      startY: 45,
      head: [["Description", "Qty", "Price", "Total"]],
      body: tableData,
    });

    doc.text(`Notes: ${notes}`, 14, doc.lastAutoTable.finalY + 10);
    doc.text(`Grand Total: ${total}`, 14, doc.lastAutoTable.finalY + 20);

    doc.save("quotation.pdf");
  };

  const printQuotation = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Create Quotation</h1>

      <Card className="mb-6 shadow">
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <Textarea
            placeholder="Customer Address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="shadow mb-6">
        <CardContent className="p-4">
          <h2 className="text-xl font-medium mb-4">Items</h2>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-3 items-center mb-3">
              <Input
                placeholder="Description"
                className="col-span-2"
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
              />
              <Input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Unit Price"
                value={item.price}
                onChange={(e) => updateItem(index, "price", Number(e.target.value))}
              />
              <Button variant="destructive" onClick={() => removeItem(index)}>
                <Trash size={16} />
              </Button>
            </div>
          ))}

          <Button onClick={addItem} className="mt-2">
            <Plus className="mr-2" size={16} /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow mb-6">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Additional Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="text-right text-lg font-semibold">Total: GHS {total}</div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={exportPDF}>
          <Download className="mr-2" size={18} /> Export PDF
        </Button>
        <Button variant="secondary" onClick={printQuotation}>
          <Printer className="mr-2" size={18} /> Print
        </Button>
      </div>
    </div>
  );
}
