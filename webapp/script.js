document.addEventListener('DOMContentLoaded', function () {
    const questions = document.querySelectorAll('.question');

    questions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isActive = question.classList.contains('active');

            // Close all other answers
            questions.forEach(q => {
                q.classList.remove('active');
                q.nextElementSibling.style.display = 'none';
            });

            // Open the clicked answer if it wasn't already active
            if (!isActive) {
                question.classList.add('active');
                answer.style.display = 'block';
            }
        });
    });
});
