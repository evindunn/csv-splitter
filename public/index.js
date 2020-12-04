function main() {
    const form = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submit');
    const fileInput = document.getElementById('file');

    function onSubmit(form) {
        console.log(form);

        const loadingScreen = document.getElementById('loading');

        fileInput.readonly = true;
        submitBtn.readonly = true;
        loadingScreen.classList.add("show");

        return true;
    }

    form.addEventListener('change', () => {
        submitBtn.disabled = !form.checkValidity();
    });

    submitBtn.addEventListener('submit', onSubmit);
}

window.addEventListener('load', () => main());
