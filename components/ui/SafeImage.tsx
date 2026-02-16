import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
    fallbackText?: string;
    containerClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
    src, 
    alt, 
    className, 
    containerClassName,
    fallbackIcon,
    fallbackText = "Imagem Expirada",
    ...props 
}) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setHasError(false);
        setIsLoading(true);

        // Check for Meta URL expiration (oe parameter)
        if (src && src.includes('fbcdn.net') && src.includes('oe=')) {
            try {
                const urlObj = new URL(src);
                const oe = urlObj.searchParams.get('oe');
                if (oe) {
                    // 'oe' is usually a hex timestamp
                    const expiryData = parseInt(oe, 16);
                    const now = Math.floor(Date.now() / 1000);
                    if (!isNaN(expiryData) && expiryData < now) {
                        // Expired!
                        console.warn(`[SafeImage] Skipping expired image: ${src}`);
                        setHasError(true);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (e) {
                // Ignore parsing errors, try loading anyway
            }
        }

        if (imgRef.current && imgRef.current.complete) {
            setIsLoading(false);
        }
    }, [src]);

    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    if (!src || hasError) {
        return (
            <div className={cn(
                "w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center",
                containerClassName
            )}>
                {fallbackIcon || <AlertCircle size={24} className="mb-2 opacity-50" />}
                <span className="text-[10px] font-medium leading-tight">{fallbackText}</span>
            </div>
        );
    }

    return (
        <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 animate-pulse">
                    <ImageIcon className="text-slate-200" size={24} />
                </div>
            )}
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                referrerPolicy="no-referrer"
                loading="lazy"
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoading ? "opacity-0" : "opacity-100",
                    className
                )}
                onError={handleError}
                onLoad={handleLoad}
                {...props}
            />
        </div>
    );
};
