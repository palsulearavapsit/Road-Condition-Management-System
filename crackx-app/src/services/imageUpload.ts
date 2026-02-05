import { supabase } from '../config/supabase';
import { Platform } from 'react-native';

/**
 * Upload image to Supabase Storage with enhanced error handling
 * @param uri - Local file URI (from ImagePicker)
 * @param folder - Folder name ('damage-photos' or 'repair-proofs')
 * @param reportId - Report ID for naming
 * @returns Public URL of uploaded image
 */
export const uploadImageToSupabase = async (
    uri: string,
    folder: 'damage-photos' | 'repair-proofs',
    reportId: string
): Promise<string> => {
    try {
        console.log('📤 Starting image upload process...');
        console.log('Platform:', Platform.OS);
        console.log('URI type:', uri.startsWith('data:') ? 'base64' : 'file');

        // Generate unique filename
        const timestamp = Date.now();

        // Fix: Detect extension correctly for both data URLs and normal URIs
        let fileExt = 'jpg';
        if (uri.startsWith('data:')) {
            const mime = uri.match(/:(.*?);/)?.[1];
            fileExt = mime ? mime.split('/')[1] : 'jpg';
        } else {
            fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
        }

        const fileName = `${reportId}_${timestamp}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        console.log('📝 File details:', { fileName, filePath, fileExt });

        // Enhanced blob conversion with timeout and better error handling
        const uriToBlob = (uri: string): Promise<Blob> => {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // Set timeout to prevent hanging
                const timeout = setTimeout(() => {
                    xhr.abort();
                    reject(new Error('Blob conversion timeout (30s)'));
                }, 30000);

                xhr.onload = function () {
                    clearTimeout(timeout);
                    if (xhr.status === 200) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`XHR failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = function (e) {
                    clearTimeout(timeout);
                    console.error('❌ uriToBlob XHR error:', e);
                    reject(new Error('Failed to convert URI to Blob'));
                };

                xhr.ontimeout = function () {
                    clearTimeout(timeout);
                    reject(new Error('XHR timeout'));
                };

                xhr.responseType = 'blob';
                xhr.open('GET', uri, true);
                xhr.timeout = 30000; // 30 second timeout
                xhr.send(null);
            });
        };

        let blob: Blob;
        if (uri.startsWith('data:')) {
            console.log('🔄 Converting base64 to Blob manually...');
            try {
                const parts = uri.split(',');
                if (parts.length !== 2) {
                    throw new Error('Invalid base64 data URI format');
                }

                const mimeMatch = parts[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

                const bstr = atob(parts[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                blob = new Blob([u8arr], { type: mime });
                console.log('✅ Base64 conversion successful');
            } catch (base64Error: any) {
                console.error('❌ Base64 conversion failed:', base64Error);
                throw new Error(`Base64 conversion failed: ${base64Error.message}`);
            }
        } else {
            // Use XHR for file:// and other URIs on mobile
            console.log('🔄 Converting URI to Blob via XHR...');
            try {
                blob = await uriToBlob(uri);
                console.log('✅ XHR conversion successful');
            } catch (xhrError: any) {
                console.error('❌ XHR conversion failed:', xhrError);
                throw new Error(`File conversion failed: ${xhrError.message}`);
            }
        }

        console.log(`📦 Prepared Blob: ${blob.type} (${(blob.size / 1024).toFixed(1)} KB)`);

        // Validate blob size
        if (blob.size === 0) {
            throw new Error('Generated blob is empty (0 bytes)');
        }

        if (blob.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error('Image too large (max 10MB)');
        }

        // Upload to Supabase Storage with retry logic
        console.log('☁️ Uploading to Supabase Storage...');
        let uploadError: any = null;
        let uploadData: any = null;

        // Try upload with timeout
        const uploadPromise = supabase.storage
            .from('report-images')
            .upload(filePath, blob, {
                contentType: blob.type || `image/${fileExt}`,
                cacheControl: '3600',
                upsert: false,
            });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout (60s)')), 60000);
        });

        try {
            const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
            uploadData = result.data;
            uploadError = result.error;
        } catch (timeoutError: any) {
            console.error('❌ Upload timeout:', timeoutError);
            throw new Error('Upload timeout - please check your internet connection');
        }

        if (uploadError) {
            console.error('❌ Supabase Storage Error:', uploadError);

            // Provide more specific error messages
            if (uploadError.message?.includes('duplicate')) {
                throw new Error('Image already uploaded. Please try again.');
            } else if (uploadError.message?.includes('network')) {
                throw new Error('Network error - please check your internet connection');
            } else if (uploadError.message?.includes('unauthorized')) {
                throw new Error('Authentication error - please log in again');
            } else {
                throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
            }
        }

        // Get public URL
        console.log('🔗 Getting public URL...');
        const { data: urlData } = supabase.storage
            .from('report-images')
            .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
            throw new Error('Failed to get public URL');
        }

        console.log('✅ Image uploaded successfully:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error: any) {
        console.error('❌ Upload Failed:', error.message || error);

        // Re-throw with user-friendly message
        if (error.message?.includes('Network request failed')) {
            throw new Error('Network connection failed. Please check your internet and try again.');
        }

        throw error;
    }
};

/**
 * Delete image from Supabase Storage
 * @param publicUrl - Public URL of the image to delete
 */
export const deleteImageFromSupabase = async (publicUrl: string): Promise<void> => {
    try {
        // Extract file path from public URL
        const urlParts = publicUrl.split('/report-images/');
        if (urlParts.length < 2) {
            console.warn('Invalid Supabase URL format');
            return;
        }

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('report-images')
            .remove([filePath]);

        if (error) {
            console.error('Failed to delete image:', error);
        } else {
            console.log('✅ Image deleted from Supabase:', filePath);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    }
};

/**
 * Check if URI is a Supabase URL
 * @param uri - URI to check
 * @returns true if it's a Supabase URL
 */
export const isSupabaseUrl = (uri: string): boolean => {
    return uri.includes('supabase.co/storage/v1/object/public/report-images/');
};

/**
 * Get optimized image URL with transformations
 * @param publicUrl - Original public URL
 * @param width - Desired width (optional)
 * @param height - Desired height (optional)
 * @returns Transformed URL
 */
export const getOptimizedImageUrl = (
    publicUrl: string,
    width?: number,
    height?: number
): string => {
    if (!isSupabaseUrl(publicUrl)) {
        return publicUrl;
    }

    // Supabase Image Transformations (if enabled)
    // Format: ?width=300&height=300&resize=cover
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (height) params.append('height', height.toString());
    if (width || height) params.append('resize', 'cover');

    return params.toString() ? `${publicUrl}?${params.toString()}` : publicUrl;
};
