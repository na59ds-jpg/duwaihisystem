
// Cloudinary Upload Helper
// Replace with your actual Cloud Name and Upload Preset
const CLOUD_NAME = "duwaihi-system"; // Placeholder, user needs to provide
const UPLOAD_PRESET = "masar_uploads"; // Placeholder, user needs to create unassigned preset

export const uploadToCloudinary = async (file: File): Promise<string> => {
    if (!file) return "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "masar_docs"); // Optional folder organization

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, // 'auto' supports image/pdf/video
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Cloudinary Error:", errorData);
            throw new Error("File upload failed");
        }

        const data = await response.json();
        return data.secure_url; // Returns the HTTPS URL of the uploaded file
    } catch (error) {
        console.error("Upload Error:", error);
        throw error;
    }
};
