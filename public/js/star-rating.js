// Initialize star ratings
document.addEventListener('DOMContentLoaded', function () {
    const starResults = document.querySelectorAll('.starability-result');

    starResults.forEach(result => {
        const rating = parseInt(result.getAttribute('data-rating'));
        if (rating >= 1 && rating <= 5) {
            result.setAttribute('data-rating', rating);
        }
    });
});