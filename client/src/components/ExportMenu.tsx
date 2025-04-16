import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown } from 'lucide-react';

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  label?: string;
}

export default function ExportMenu({ onExportCSV, onExportPDF, label = 'Export' }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <FileDown className="h-4 w-4" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => {
            onExportCSV();
            setIsOpen(false);
          }}
        >
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            onExportPDF();
            setIsOpen(false);
          }}
        >
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}