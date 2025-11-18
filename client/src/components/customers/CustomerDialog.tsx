import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import CustomerForm from "@/components/forms/CustomerForm";
import { PlusIcon, Users } from "lucide-react";

interface CustomerDialogProps {
  onSuccess?: () => void;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonLabel?: string;
  fullWidth?: boolean;
}

export default function CustomerDialog({
  onSuccess,
  buttonVariant = "outline",
  buttonLabel = "Add Customer",
  fullWidth = false,
}: CustomerDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonVariant} 
          className={fullWidth ? "w-full" : ""}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your contacts. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <CustomerForm 
          onSuccess={handleSuccess} 
          onCancel={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}