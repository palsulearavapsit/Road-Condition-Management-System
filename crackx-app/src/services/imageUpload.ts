import { supabase } from '../config/supabase';

/**
 * Upload image to Supabase Storage
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

        let blob: Blob;

        // MANUALLY convert base64 to Blob to bypass ANY "fetch" based CORS issues
        if (uri.startsWith('data:')) {
            console.log('🔄 Converting base64 to Blob manually...');
            const parts = uri.split(',');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            blob = new Blob([u8arr], { type: mime });
        } else {
            // For regular URLs, try a standard fetch
            const response = await fetch(uri);
            blob = await response.blob();
        }

        console.log(`📦 Prepared Blob: ${blob.type} (${(blob.size / 1024).toFixed(1)} KB)`);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('report-images')
            .upload(filePath, blob, {
                contentType: blob.type || `image/${fileExt}`,
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('❌ Supabase Storage Error:', error);
            throw error;
        }

        // Get public URL
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
