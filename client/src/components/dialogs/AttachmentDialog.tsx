import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { TransactionAttachment } from "@shared/schema";

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: number;
}

export function AttachmentDialog({
  open,
  onOpenChange,
  transactionId,
}: AttachmentDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery<TransactionAttachment[]>({
    queryKey: ['/api/imported-transactions', transactionId, 'attachments'],
    enabled: open,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/imported-transactions/${transactionId}/attachments`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({
        queryKey: ['/api/imported-transactions', transactionId, 'attachments'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return apiRequest(
        `/api/imported-transactions/${transactionId}/attachments/${attachmentId}`,
        'DELETE'
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/imported-transactions', transactionId, 'attachments'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDownload = (attachment: TransactionAttachment) => {
    window.open(`/api/imported-transactions/${transactionId}/attachments/${attachment.id}/download`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Transaction Attachments</DialogTitle>
          <DialogDescription>
            Upload and manage files for this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Upload New File</h4>
            <div className="flex gap-2">
              <input
                type="file"
                onChange={handleFileChange}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                data-testid="input-file-upload"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                data-testid="button-upload-file"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Attachments List */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3">Attached Files ({attachments.length})</h4>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No attachments yet
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    data-testid={`attachment-${attachment.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.fileSize)} • {new Date(attachment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        data-testid={`button-download-${attachment.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(attachment.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${attachment.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
