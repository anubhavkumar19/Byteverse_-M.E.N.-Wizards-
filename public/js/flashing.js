document.addEventListener('DOMContentLoaded', function () {
  // Auto-dismiss flash messages after 5 seconds
  const flashMessages = document.querySelectorAll('.flash-toast');

  flashMessages.forEach(message => {
    // Auto-hide after 5 seconds
    setTimeout(() => {
      message.style.animation = 'slideOut 0.5s forwards';
      setTimeout(() => message.remove(), 500);
    }, 5000);

    // Manual close button
    const closeBtn = message.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        message.style.animation = 'slideOut 0.5s forwards';
        setTimeout(() => message.remove(), 500);
      });
    }
  });
});