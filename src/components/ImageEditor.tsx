import React, { useState, useRef } from 'react';
import { editFloorPlanImage } from '../services/gemini';
import { Loader2, Upload, Wand2 } from 'lucide-react';

export function ImageEditor() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;

    setIsProcessing(true);
    try {
      const editedImageUrl = await editFloorPlanImage(image, prompt);
      if (editedImageUrl) {
        setResult(editedImageUrl);
      } else {
        alert(
          'Image editing is not available with the current model. Try describing what you want in text instead.'
        );
      }
    } catch (error) {
      console.error('Error editing image:', error);
      alert('Failed to edit image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg rounded-xl border border-border shadow-elev-ring overflow-hidden">
      <div className="p-4 border-b border-border-soft bg-surface-warm/50">
        <h2 className="text-lg font-semibold text-fg-2 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-accent" />
          AI Image Editor
        </h2>
        <p className="text-sm text-muted mt-1">
          Upload a floor plan or room sketch and use Gemini to edit it (e.g., "Add a retro filter",
          "Make it look like a 3D render").
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        {!preview ? (
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-bg transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-meta mb-3" />
            <p className="text-sm font-medium text-fg-2">Click to upload an image</p>
            <p className="text-xs text-muted mt-1">PNG, JPG up to 5MB</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden border border-border bg-surface-warm aspect-video flex items-center justify-center">
              <img
                src={result || preview}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-muted bg-surface-warm hover:bg-surface px-3 py-1.5 rounded-lg transition-colors"
              >
                Change Image
              </button>
              {result && (
                <button
                  onClick={() => setResult(null)}
                  className="text-xs font-medium text-muted bg-surface-warm hover:bg-surface px-3 py-1.5 rounded-lg transition-colors"
                >
                  View Original
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-sm font-medium text-fg-2">Edit Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Add a retro filter, remove the background, make it look like a blueprint..."
                className="w-full text-sm p-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none h-24"
              />
              <button
                onClick={handleEdit}
                disabled={!prompt || isProcessing}
                className="mt-2 w-full bg-accent hover:bg-accent-hover text-accent-on font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Edit
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
