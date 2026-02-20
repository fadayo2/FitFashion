window.withLoader = async (buttonElement, actionFn) => {
    if (!buttonElement || buttonElement.disabled) return;

    // Save original state
    const originalHTML = buttonElement.innerHTML;
    
    // Set loading state
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<div class="flex items-center justify-center gap-2">
        <span class="btn-spinner"></span>
    </div>`;

    try {
        await actionFn(); // Run the actual logic (e.g., Supabase update)
    } catch (error) {
        console.error("Action failed:", error);
    } finally {
        // Restore original state
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalHTML;
    }
};