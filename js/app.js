/**
 * Shai Invoice Generator 2.0 - App Navigation Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.bottom-nav .nav-btn');
    const sections = document.querySelectorAll('.app-container .app-section');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');

            // Update active button state
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active section visibility
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });

            // Scroll back to top when switching tabs on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
});
