function main() {
    const form = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submit');
    const fileInput = document.getElementById('file');
    const loadingScreen = document.getElementById('loading');

    function onSubmit() {
        fileInput.readonly = true;
        submitBtn.disabled = true;
        loadingScreen.classList.add("show");

        return true;
    }

    form.addEventListener('change', () => {
        submitBtn.disabled = !form.checkValidity();
    });

    form.addEventListener('submit', onSubmit);
}

window.addEventListener('load', () => main());
