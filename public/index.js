function download(downloadName, downloadData) {
    const blobUrl = URL.createObjectURL(downloadData);
    const link = document.createElement('a');

    link.style.display = 'none';
    link.href = blobUrl;
    link.download = downloadName;

    document.body.appendChild(link);
    link.click();
    link.remove();
}

function parseFileName(contentDisposition) {
    const matchRegex = /(?<=filename=")([^"]+)(?=")/g;
    const res = contentDisposition.match(matchRegex);
    if (res && res.length === 1) {
        return res[0];
    }
    return 'unknown-file';
}

function main() {
    const submitBtn = document.getElementById('submit');
    const fileInput = document.getElementById('file');
    const loadingScreen = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    function showLoading(loading) {
        if (loading) {
            errorDiv.innerText = '';
            fileInput.disabled = true;
            submitBtn.disabled = true;
            loadingScreen.classList.add("show");
        }
        else {
            loadingScreen.classList.remove("show");
            fileInput.disabled = false;
            submitBtn.disabled = false;
        }
    }

    async function onSubmit() {
        showLoading(true);

        const formData = new FormData();
        formData.set('file', fileInput.files[0]);

        const response = await fetch('/', {
            method: 'POST',
            body: formData
        });

        if (response.status === 200) {
            const contentDisp = response.headers.get('Content-Disposition');
            const fileName = parseFileName(contentDisp);
            const fileData = await response.blob();
            download(fileName, fileData);
        }
        else {
            try {
                const resJson = await response.json();
                errorDiv.innerText = resJson.error || 'Unknown error';
            }
            catch (e) {
                errorDiv.innerText = 'Unknown error';
            }
        }

        showLoading(false);
    }

    fileInput.addEventListener('change', () => {
        submitBtn.disabled = !fileInput.files || fileInput.files.length !== 1;
    });

    submitBtn.addEventListener('click', onSubmit);
}

window.addEventListener('load', () => main());
