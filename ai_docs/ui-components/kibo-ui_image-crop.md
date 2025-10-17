# Kibo UI - Image Crop

> Source: https://www.kibo-ui.com/components/image-crop
> Version: Latest (as of October 2025)
> Last Updated: October 16, 2025

## Overview

The Image Crop component is a powerful, composable React component from Kibo UI that enables users to crop images with customizable aspect ratios and circular cropping options. Built on top of `react-image-crop`, it provides an accessible and flexible solution for image manipulation with automatic compression and size management.

The component uses a context-based architecture for state management, allowing for flexible composition and custom styling while maintaining backward compatibility through a legacy wrapper component.

## Key Features

- Interactive image cropping with drag-and-resize functionality
- Support for custom aspect ratios or free-form cropping
- Circular crop mode for profile pictures and avatars
- Automatic image scaling and compression based on maximum file size
- Returns cropped image as PNG data URL for easy upload or display
- Uses shadcn/ui design variables for consistent styling
- Responsive design that adapts to container size
- Built-in checkered background pattern for transparency preview
- Full TypeScript support with comprehensive type definitions
- Accessible controls and keyboard navigation support
- Composable architecture using React Context API

## Installation

### Using Kibo UI CLI (Recommended)

```bash
npx kibo-ui add image-crop
```

### Using shadcn CLI

```bash
npx shadcn add image-crop
```

### Manual Installation

If you prefer to install manually, you'll need to install the required dependencies:

```bash
# Using npm
npm install react-image-crop lucide-react

# Using yarn
yarn add react-image-crop lucide-react

# Using pnpm
pnpm add react-image-crop lucide-react
```

## Dependencies

The Image Crop component requires the following dependencies:

- **react** (^19.0.0 or compatible version)
- **react-dom** (^19.0.0 or compatible version)
- **react-image-crop** (^11.0.10) - Core cropping functionality
- **lucide-react** (^0.545.0) - Icon components
- **@radix-ui/react-slot** (^1.4.3) - For composable button patterns
- **shadcn/ui Button component** - UI styling

### Peer Dependencies

Ensure you have shadcn/ui set up in your project, as the component relies on shadcn/ui's CSS variables and Button component.

## Component Architecture

The Image Crop component uses a composable architecture with the following components:

- **ImageCrop** - Root provider component that manages state
- **ImageCropContent** - Renders the crop interface
- **ImageCropApply** - Button to apply the crop
- **ImageCropReset** - Button to reset to initial crop state
- **Cropper** - Legacy wrapper for backward compatibility

## Props / API Reference

### ImageCrop (Root Component)

The main component that wraps the cropping functionality.

```typescript
interface ImageCropProps extends Omit<ReactCropProps, 'crop' | 'onChange'> {
  file: File;                                    // Required: The image file to crop
  maxImageSize?: number;                        // Optional: Max size in bytes (default: 5MB)
  onCrop?: (croppedImage: string) => void;      // Optional: Callback when crop is applied
  onChange?: (crop: PixelCrop, percentCrop: PercentCrop) => void;  // Optional: Crop change handler
  onComplete?: (crop: PixelCrop, percentCrop: PercentCrop) => void; // Optional: Crop complete handler
  children: ReactNode;                          // Required: Child components
}
```

#### Props Details

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `File` | Required | The image file to be cropped |
| `maxImageSize` | `number` | `5242880` (5MB) | Maximum file size in bytes for the output image |
| `onCrop` | `(croppedImage: string) => void` | `undefined` | Callback function that receives the cropped image as a PNG data URL |
| `onChange` | `(crop: PixelCrop, percentCrop: PercentCrop) => void` | `undefined` | Called when crop dimensions change |
| `onComplete` | `(crop: PixelCrop, percentCrop: PercentCrop) => void` | `undefined` | Called when cropping interaction is complete |
| `aspect` | `number` | `undefined` | Aspect ratio for the crop (e.g., 16/9, 1, 4/3) |
| `circularCrop` | `boolean` | `false` | Enable circular crop mode |
| `children` | `ReactNode` | Required | Child components (typically ImageCropContent and buttons) |

### ImageCropContent

Renders the actual cropping interface.

```typescript
interface ImageCropContentProps {
  className?: string;  // Optional: Additional CSS classes
}
```

### ImageCropApply

Button component to apply the crop operation.

```typescript
interface ImageCropApplyProps {
  asChild?: boolean;   // Use Radix Slot for custom button
  children?: ReactNode; // Custom button content
  className?: string;   // Additional CSS classes
}
```

### ImageCropReset

Button component to reset the crop to its initial state.

```typescript
interface ImageCropResetProps {
  asChild?: boolean;   // Use Radix Slot for custom button
  children?: ReactNode; // Custom button content
  className?: string;   // Additional CSS classes
}
```

## Usage Examples

### Example 1: Basic Usage

```typescript
'use client';

import { useState } from 'react';
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/image-crop';

export function BasicImageCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCrop = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    console.log('Cropped image ready:', croppedDataUrl);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
      />

      {file && (
        <ImageCrop file={file} onCrop={handleCrop} aspect={16 / 9}>
          <ImageCropContent />
          <div className="flex gap-2 mt-4">
            <ImageCropApply />
            <ImageCropReset />
          </div>
        </ImageCrop>
      )}

      {croppedImage && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Preview:</h3>
          <img src={croppedImage} alt="Cropped" className="max-w-md rounded-lg shadow-lg" />
        </div>
      )}
    </div>
  );
}
```

### Example 2: Circular Crop for Avatar

```typescript
'use client';

import { useState } from 'react';
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/image-crop';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function AvatarCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAvatarCrop = (croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    setFile(null); // Close crop interface
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarUrl} alt="User avatar" />
          <AvatarFallback>UN</AvatarFallback>
        </Avatar>

        <label className="cursor-pointer">
          <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            Change Avatar
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="sr-only"
          />
        </label>
      </div>

      {file && (
        <ImageCrop
          file={file}
          onCrop={handleAvatarCrop}
          aspect={1}
          circularCrop
        >
          <ImageCropContent className="max-w-md" />
          <div className="flex gap-2 mt-4">
            <ImageCropApply>Save Avatar</ImageCropApply>
            <ImageCropReset>Reset</ImageCropReset>
          </div>
        </ImageCrop>
      )}
    </div>
  );
}
```

### Example 3: Custom Buttons with asChild Pattern

```typescript
'use client';

import { useState } from 'react';
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/image-crop';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export function CustomButtonsCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {file && (
        <ImageCrop file={file} onCrop={setCroppedImage} aspect={4 / 3}>
          <ImageCropContent />

          <div className="flex gap-2 mt-4">
            <ImageCropApply asChild>
              <Button variant="default" size="lg">
                <Check className="mr-2 h-4 w-4" />
                Apply Crop
              </Button>
            </ImageCropApply>

            <ImageCropReset asChild>
              <Button variant="outline" size="lg">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </ImageCropReset>
          </div>
        </ImageCrop>
      )}

      {croppedImage && (
        <img src={croppedImage} alt="Result" className="rounded-lg" />
      )}
    </div>
  );
}
```

### Example 4: Free-form Crop with Multiple Aspect Ratios

```typescript
'use client';

import { useState } from 'react';
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/image-crop';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ASPECT_RATIOS = {
  'free': undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '3:2': 3 / 2,
} as const;

export function MultiAspectCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedImage, setCroppedImage] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAspectChange = (value: string) => {
    setAspect(ASPECT_RATIOS[value as keyof typeof ASPECT_RATIOS]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Select Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full"
          />
        </div>

        <div className="w-40">
          <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
          <Select onValueChange={handleAspectChange} defaultValue="free">
            <SelectTrigger>
              <SelectValue placeholder="Select ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free Form</SelectItem>
              <SelectItem value="1:1">Square (1:1)</SelectItem>
              <SelectItem value="4:3">Standard (4:3)</SelectItem>
              <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
              <SelectItem value="3:2">Classic (3:2)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {file && (
        <ImageCrop
          file={file}
          onCrop={setCroppedImage}
          aspect={aspect}
          key={aspect} // Force re-render when aspect changes
        >
          <ImageCropContent />
          <div className="flex gap-2 mt-4">
            <ImageCropApply />
            <ImageCropReset />
          </div>
        </ImageCrop>
      )}

      {croppedImage && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Cropped Result:</h3>
          <img src={croppedImage} alt="Cropped result" className="max-w-full" />
        </div>
      )}
    </div>
  );
}
```

### Example 5: Advanced Usage with Upload Integration

```typescript
'use client';

import { useState } from 'react';
import { ImageCrop, ImageCropContent, ImageCropApply, ImageCropReset } from '@/components/ui/image-crop';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

export function ImageCropWithUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCroppedImage(''); // Clear previous crop
    }
  };

  const handleCrop = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setFile(null); // Close crop interface
  };

  const handleUpload = async () => {
    if (!croppedImage) return;

    setUploading(true);
    try {
      // Convert data URL to Blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append('image', blob, 'cropped-image.png');

      // Upload to your API
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const data = await uploadResponse.json();
      console.log('Upload successful:', data);

      // Reset state
      setCroppedImage('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          id="file-upload"
          className="sr-only"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload className="h-12 w-12 text-gray-400 mb-3" />
          <span className="text-sm font-medium text-gray-700">
            Click to upload an image
          </span>
          <span className="text-xs text-gray-500 mt-1">
            PNG, JPG, GIF up to 10MB
          </span>
        </label>
      </div>

      {file && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Crop Your Image</h3>
          <ImageCrop
            file={file}
            onCrop={handleCrop}
            aspect={16 / 9}
            maxImageSize={2 * 1024 * 1024} // 2MB max
          >
            <ImageCropContent />
            <div className="flex gap-2 mt-4">
              <ImageCropApply>Crop Image</ImageCropApply>
              <ImageCropReset />
            </div>
          </ImageCrop>
        </div>
      )}

      {croppedImage && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Preview</h3>
          <img
            src={croppedImage}
            alt="Cropped preview"
            className="w-full rounded-lg"
          />
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
```

## How It Works

### Image Processing Flow

1. **File Selection**: User selects an image file through an input
2. **Data URL Conversion**: The component converts the File to a data URL using FileReader
3. **Crop Initialization**: A centered crop area is calculated based on the aspect ratio
4. **User Interaction**: User adjusts the crop area through drag and resize
5. **Apply Crop**: When applied, the component:
   - Uses HTML5 Canvas to extract the cropped region
   - Converts to PNG format
   - Recursively compresses if exceeds max size
   - Returns as data URL through the `onCrop` callback

### Compression Algorithm

The component includes an intelligent compression system:

```typescript
// Pseudocode representation
function getCroppedPngImage(image, crop, maxSize) {
  // Draw cropped region to canvas
  canvas.drawImage(image, crop.x, crop.y, crop.width, crop.height);

  // Try to convert with quality 1.0
  let quality = 1.0;
  let blob = await canvas.toBlob('image/png', quality);

  // If too large, recursively reduce quality
  while (blob.size > maxSize && quality > 0.1) {
    quality -= 0.1;
    blob = await canvas.toBlob('image/png', quality);
  }

  return dataURL;
}
```

## Accessibility

The Image Crop component is built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support for crop manipulation
- **Screen Reader Support**: Proper ARIA labels on interactive elements
- **Focus Management**: Clear focus indicators on buttons and controls
- **Touch Support**: Works seamlessly on touch devices

### Best Practices for Accessibility

```typescript
<ImageCrop file={file} onCrop={handleCrop}>
  <ImageCropContent aria-label="Image cropping area" />
  <div className="flex gap-2 mt-4" role="group" aria-label="Crop controls">
    <ImageCropApply aria-label="Apply crop changes" />
    <ImageCropReset aria-label="Reset crop to original" />
  </div>
</ImageCrop>
```

## Best Practices

### 1. File Size Management

Always set an appropriate `maxImageSize` based on your use case:

```typescript
// For avatars and thumbnails
<ImageCrop file={file} maxImageSize={1 * 1024 * 1024}> {/* 1MB */}

// For general images
<ImageCrop file={file} maxImageSize={5 * 1024 * 1024}> {/* 5MB (default) */}

// For high-quality images
<ImageCrop file={file} maxImageSize={10 * 1024 * 1024}> {/* 10MB */}
```

### 2. Validate File Type

Always validate file types before passing to the component:

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB
      alert('File is too large. Please select a file under 20MB');
      return;
    }

    setFile(file);
  }
};
```

### 3. Error Handling

Implement proper error handling for the crop operation:

```typescript
const handleCrop = async (croppedDataUrl: string) => {
  try {
    // Validate data URL
    if (!croppedDataUrl.startsWith('data:image/png')) {
      throw new Error('Invalid image format');
    }

    // Process the cropped image
    setCroppedImage(croppedDataUrl);

    // Optionally upload immediately
    await uploadImage(croppedDataUrl);
  } catch (error) {
    console.error('Crop error:', error);
    toast.error('Failed to process image');
  }
};
```

### 4. Memory Management

Clean up data URLs when component unmounts:

```typescript
useEffect(() => {
  return () => {
    // Revoke object URLs to prevent memory leaks
    if (croppedImage) {
      URL.revokeObjectURL(croppedImage);
    }
  };
}, [croppedImage]);
```

### 5. Loading States

Provide visual feedback during file loading:

```typescript
const [loading, setLoading] = useState(false);

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setLoading(true);
  try {
    // Validate and process file
    setFile(file);
  } finally {
    setLoading(false);
  }
};
```

## Common Issues and Solutions

### Issue 1: Large File Processing

**Problem**: Browser freezes when processing very large images.

**Solution**: Implement image pre-processing to resize before cropping:

```typescript
async function resizeImage(file: File, maxWidth: number = 2000): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/png' }));
      }, 'image/png');
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### Issue 2: Incorrect Aspect Ratio

**Problem**: Crop doesn't maintain the specified aspect ratio.

**Solution**: Use the `key` prop to force re-initialization when aspect changes:

```typescript
<ImageCrop
  file={file}
  aspect={aspectRatio}
  key={`crop-${aspectRatio}`}
>
```

### Issue 3: Memory Leaks

**Problem**: Application becomes slow after multiple crop operations.

**Solution**: Revoke object URLs and clear state properly:

```typescript
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);
```

## TypeScript Support

The component is fully typed with comprehensive TypeScript definitions:

```typescript
import type { PixelCrop, PercentCrop } from 'react-image-crop';

interface ImageCropContextType {
  file: File | null;
  src: string;
  crop: PercentCrop;
  completedCrop: PixelCrop;
  imgRef: RefObject<HTMLImageElement>;
  onCropChange: (crop: PixelCrop, percentCrop: PercentCrop) => void;
  onCropComplete: (crop: PixelCrop, percentCrop: PercentCrop) => void;
  onImageLoad: (e: SyntheticEvent<HTMLImageElement>) => void;
  applyCrop: () => void;
  resetCrop: () => void;
}
```

## Styling

The component uses shadcn/ui CSS variables and Tailwind CSS. You can customize styling by:

### 1. Using className prop

```typescript
<ImageCropContent className="border-2 border-primary rounded-lg" />
```

### 2. Modifying CSS variables

```css
:root {
  --crop-border-color: hsl(var(--primary));
  --crop-background: hsl(var(--background));
}
```

### 3. Using the asChild pattern for complete control

```typescript
<ImageCropApply asChild>
  <button className="custom-button">
    Apply Crop
  </button>
</ImageCropApply>
```

## Related Components

- **Avatar** - Use with circular crop for user avatars
- **Image** - Display cropped images
- **Upload** - File upload interface
- **Dialog** - Contain crop interface in a modal

## Browser Compatibility

The Image Crop component works in all modern browsers that support:

- HTML5 Canvas API
- FileReader API
- Blob API
- ES6+ JavaScript

Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Additional Resources

- [Kibo UI Documentation](https://www.kibo-ui.com/components/image-crop)
- [react-image-crop Documentation](https://github.com/DominicTobias/react-image-crop)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [GitHub Repository](https://github.com/haydenbleasel/kibo)

## License

This component is part of Kibo UI, which is licensed under the MIT License. Free and open source, forever.
