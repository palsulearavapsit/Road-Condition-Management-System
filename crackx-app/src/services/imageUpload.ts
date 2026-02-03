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
        const fileExt = uri.split('.').pop() || 'jpg';
        const fileName = `${reportId}_${timestamp}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // Convert URI to blob for upload
        const response = await fetch(uri);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('report-images')
            .upload(filePath, blob, {
                contentType: `image/${fileExt}`,
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('report-images')
            .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
            throw new Error('Failed to get public URL');
        }

        console.log('✅ Image uploaded to Supabase:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Failed to upload image to Supabase:', error);
        throw error; // Fail hard so we don't save invalid local URIs
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
