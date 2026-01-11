import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateOfficialPDF = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element not found for PDF generation");
        return;
    }

    try {
        // High quality canvas capture
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // Allow cross-origin images (important for Cloudinary)
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff', // Ensure white background
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();


        // Fit image to PDF page
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // If image is taller than page, might need multi-page logic (simplified for now to 1 page fit or crop)
        // For official forms, usually 1 page is ideal.

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);

    } catch (error) {
        console.error("PDF Generation Failed:", error);
        throw error;
    }
};
