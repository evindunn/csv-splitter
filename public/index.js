async function submit() {
    const submitBtn = document.getElementById('submit');
    const loadingScreen = document.getElementById('loading');
    const formData = new FormData();
    const fileInput = document.getElementById('file');

    if (fileInput.files.length !== 1) {
        return;
    }

    submitBtn.disabled = true;
    loadingScreen.classList.add("show");
    formData.append('file', fileInput.files[0]);

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    }).then(async (response) => {
        const contentDispo = response.headers.get('Content-Disposition');
        const fileName = /filename="([^"]+)"/g.exec(contentDispo)[1];
        return {
            fileName,
            data: await response.blob()
        };
    });

    const downloadUrl = window.URL.createObjectURL(response.data);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = response.fileName;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    loadingScreen.classList.remove("show");
    submitBtn.disabled = false;
}
