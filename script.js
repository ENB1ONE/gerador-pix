/**
 * GERADOR DE PIX PRO - Core Logic
 * Standards: BCB / EMV Co / BR Code
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('pix-form');
    const keyTypeInput = document.getElementById('key-type');
    const pixKeyInput = document.getElementById('pix-key');
    const pixValueInput = document.getElementById('pix-value');
    const pixFeeInput = document.getElementById('pix-fee');
    const totalDisplay = document.getElementById('total-display');
    const identifierInput = document.getElementById('pix-identifier');
    const btnGenerate = document.getElementById('btn-generate');
    const btnCopyPaste = document.getElementById('btn-copy-paste');
    const resultSection = document.getElementById('result-section');
    const qrcodeContainer = document.getElementById('qrcode');
    const btnDownload = document.getElementById('btn-download');
    const btnCopyResult = document.getElementById('btn-copy-result');
    const copyText = document.getElementById('copy-text');
    const keyError = document.getElementById('key-error');
    const btnReset = document.getElementById('btn-reset');
    const qrWrapper = document.getElementById('qr-wrapper');

    let currentPayload = '';

    // --- 1. UI Logic ---

    // Key Type Selector
    document.querySelectorAll('.key-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.key-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            keyTypeInput.value = btn.dataset.type;
            
            // Adjust placeholder and keyboard based on type
            const placeholders = {
                'CPF': '000.000.000-00',
                'EMAIL': 'seu@email.com',
                'PHONE': '+55 (11) 99999-9999', // Celular
                'RANDOM': 'Chave de 32 caracteres'
            };
            
            pixKeyInput.placeholder = placeholders[btn.dataset.type] || 'Insira sua chave';
            
            // Set keyboard type
            if (btn.dataset.type === 'CPF' || btn.dataset.type === 'PHONE') {
                pixKeyInput.setAttribute('inputmode', 'numeric');
                pixKeyInput.setAttribute('pattern', '[0-9]*');
            } else if (btn.dataset.type === 'EMAIL') {
                pixKeyInput.setAttribute('inputmode', 'email');
                pixKeyInput.removeAttribute('pattern');
            } else {
                pixKeyInput.setAttribute('inputmode', 'text');
                pixKeyInput.removeAttribute('pattern');
            }

            validateKey(); // Re-validate when switching types
        });
    });

    // Validation Functions
    const validateCPF = (cpf) => {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
        
        let sum = 0;
        let remainder;

        for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (11 - i);
        remainder = (sum * 10) % 11;
        if ((remainder == 10) || (remainder == 11)) remainder = 0;
        if (remainder != parseInt(cpf.substring(9, 10))) return false;

        sum = 0;
        for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i-1, i)) * (12 - i);
        remainder = (sum * 10) % 11;
        if ((remainder == 10) || (remainder == 11)) remainder = 0;
        if (remainder != parseInt(cpf.substring(10, 11))) return false;

        return true;
    };

    const validateCNPJ = (cnpj) => {
        cnpj = cnpj.replace(/\D/g, '');
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        let digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;

        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }

        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result != digits.charAt(0)) return false;

        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }

        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result != digits.charAt(1)) return false;

        return true;
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validatePhone = (phone) => {
        const clean = phone.replace(/\D/g, '');
        return clean.length >= 10 && clean.length <= 13;
    };

    const validateRandom = (key) => {
        return key.length >= 32;
    };

    const validateKey = () => {
        const type = keyTypeInput.value;
        const value = pixKeyInput.value.trim();
        let isValid = false;

        if (!value) {
            hideError();
            return false;
        }

        switch (type) {
            case 'CPF':
                isValid = value.replace(/\D/g, '').length > 11 ? validateCNPJ(value) : validateCPF(value);
                break;
            case 'EMAIL':
                isValid = validateEmail(value);
                break;
            case 'PHONE':
                isValid = validatePhone(value);
                break;
            case 'RANDOM':
                isValid = validateRandom(value);
                break;
            default:
                isValid = value.length > 0;
        }

        if (isValid) {
            hideError();
        } else {
            showError();
        }

        return isValid;
    };

    const showError = () => {
        pixKeyInput.classList.add('error');
        keyError.style.display = 'block';
    };

    const hideError = () => {
        pixKeyInput.classList.remove('error');
        keyError.style.display = 'none';
    };

    pixKeyInput.addEventListener('input', validateKey);

    // Currency Mask Logic
    const formatCurrency = (input) => {
        let value = input.value.replace(/\D/g, '');
        value = (value / 100).toFixed(2) + '';
        value = value.replace(".", ",");
        value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
        input.value = value;
    };

    const parseCurrency = (value) => {
        if (!value) return 0;
        return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Dynamic Total Calculation
    const updateTotal = () => {
        const val = parseCurrency(pixValueInput.value);
        const fee = parseCurrency(pixFeeInput.value);
        const total = val + fee;
        totalDisplay.textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    pixValueInput.addEventListener('input', (e) => {
        formatCurrency(e.target);
        updateTotal();
    });

    pixFeeInput.addEventListener('input', (e) => {
        formatCurrency(e.target);
        updateTotal();
    });

    // --- 2. Pix Engine (BR Code / EMV Co) ---

    /**
     * Formata um campo no padrão TLV (Tag, Length, Value)
     */
    function formatTLV(id, value) {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    }

    /**
     * Cálculo do CRC16 (Polinômio 0x1021)
     */
    function getCRC16(data) {
        let crc = 0xFFFF;
        const polynomial = 0x1021;

        for (let i = 0; i < data.length; i++) {
            let b = data.charCodeAt(i);
            for (let j = 0; j < 8; j++) {
                let bit = ((b >> (7 - j)) & 1) == 1;
                let c15 = ((crc >> 15) & 1) == 1;
                crc <<= 1;
                if (c15 ^ bit) crc ^= polynomial;
            }
        }

        crc &= 0xFFFF;
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    /**
     * Gera o Payload final do Pix
     */
    function generatePayload() {
        let key = pixKeyInput.value.trim();
        const value = parseCurrency(pixValueInput.value) + parseCurrency(pixFeeInput.value);
        const identifier = identifierInput.value.trim() || '***';

        // Phone specific formatting: add +55 if it looks like a BR number
        if (keyTypeInput.value === 'PHONE') {
            const cleanKey = key.replace(/\D/g, '');
            if (cleanKey.length >= 10 && !key.startsWith('+')) {
                key = `+55${cleanKey}`;
            } else if (key.startsWith('55') && !key.startsWith('+')) {
                key = `+${key}`;
            }
        }
        
        // 00: Payload Format Indicator (Fixed)
        let payload = formatTLV('00', '01');

        // 26: Merchant Account Information
        const gui = formatTLV('00', 'BR.GOV.BCB.PIX');
        const keyField = formatTLV('01', key);
        payload += formatTLV('26', gui + keyField);

        // 52: Merchant Category Code
        payload += formatTLV('52', '0000');

        // 53: Transaction Currency (986 = BRL)
        payload += formatTLV('53', '986');

        // 54: Transaction Amount
        if (value > 0) {
            payload += formatTLV('54', value.toFixed(2));
        }

        // 58: Country Code
        payload += formatTLV('58', 'BR');

        // 59: Merchant Name
        payload += formatTLV('59', 'N');

        // 60: Merchant City
        payload += formatTLV('60', 'C');

        // 62: Additional Data Field Template
        const txid = formatTLV('05', identifier.replace(/\s+/g, '').toUpperCase()); 
        payload += formatTLV('62', txid);

        // 63: CRC16
        payload += '6304'; // Tag + Length header
        payload += getCRC16(payload);

        return payload;
    }

    // --- 3. Actions ---

    const showResult = (payload, showQR = true) => {
        currentPayload = payload;
        resultSection.classList.remove('hidden');
        
        if (showQR) {
            qrWrapper.classList.remove('hidden');
            btnDownload.classList.remove('hidden');
            // Clear previous QR
            qrcodeContainer.innerHTML = '';
            // Generate new QR
            new QRCode(qrcodeContainer, {
                text: payload,
                width: 256,
                height: 256,
                colorDark: "#1D1D1F",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            qrWrapper.classList.add('hidden');
            btnDownload.classList.add('hidden');
        }

        // Scroll to results
        resultSection.scrollIntoView({ behavior: 'smooth' });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateKey()) {
            pixKeyInput.focus();
            return;
        }
        const payload = generatePayload();
        showResult(payload, true);
    });

    btnCopyPaste.addEventListener('click', () => {
        if (!validateKey()) {
            pixKeyInput.focus();
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const payload = generatePayload();
        
        // Show result section WITHOUT QR Code
        showResult(payload, false);
        
        // Also copy to clipboard immediately as requested by the button action
        navigator.clipboard.writeText(payload).then(() => {
            btnCopyPaste.textContent = 'Copiado!';
            btnCopyPaste.classList.add('bg-[#32BCAD]', 'text-white');
            setTimeout(() => {
                btnCopyPaste.textContent = 'Gerar Pix Copia e Cola';
                btnCopyPaste.classList.remove('bg-[#32BCAD]', 'text-white');
            }, 2000);
        });
    });

    // Copy from result card
    btnCopyResult.addEventListener('click', () => {
        navigator.clipboard.writeText(currentPayload).then(() => {
            const originalText = copyText.textContent;
            copyText.textContent = 'Copiado!';
            setTimeout(() => {
                copyText.textContent = originalText;
            }, 2000);
        });
    });

    // Download QR Code
    btnDownload.addEventListener('click', () => {
        const img = qrcodeContainer.querySelector('img');
        const canvas = qrcodeContainer.querySelector('canvas');
        
        let dataUrl = '';
        if (img && img.src) {
            dataUrl = img.src;
        } else if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
        }

        if (dataUrl) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `pix-qrcode-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // Reset Form
    btnReset.addEventListener('click', () => {
        form.reset();
        resultSection.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        hideError();
        // Reset key specific attributes to default (CPF)
        pixKeyInput.placeholder = '000.000.000-00';
        pixKeyInput.setAttribute('inputmode', 'numeric');
        pixKeyInput.setAttribute('pattern', '[0-9]*');
        
        // Reset buttons active state
        document.querySelectorAll('.key-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-type="CPF"]').classList.add('active');
        keyTypeInput.value = 'CPF';
    });

    // --- 4. PWA Logic ---

    // --- 4. PWA Logic ---

    let deferredPrompt;
    const pwaModal = document.getElementById('pwa-modal');
    const pwaInstallBtn = document.getElementById('pwa-install');
    const pwaCancelBtn = document.getElementById('pwa-cancel');
    const iosModal = document.getElementById('ios-modal');
    const iosCloseBtn = document.getElementById('ios-close');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered'))
                .catch(err => console.log('SW Registration Failed', err));
        });
    }

    // Capture Install Prompt (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        if (!sessionStorage.getItem('pwa-prompt-shown') && !isStandalone) {
            setTimeout(() => {
                pwaModal.classList.remove('hidden');
                sessionStorage.setItem('pwa-prompt-shown', 'true');
            }, 3000);
        }
    });

    // Handle iOS Guide
    if (isIOS && !isStandalone && !sessionStorage.getItem('pwa-prompt-shown')) {
        setTimeout(() => {
            iosModal.classList.remove('hidden');
            sessionStorage.setItem('pwa-prompt-shown', 'true');
        }, 3000);
    }

    pwaInstallBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
        pwaModal.classList.add('hidden');
    });

    pwaCancelBtn.addEventListener('click', () => {
        pwaModal.classList.add('hidden');
    });

    iosCloseBtn.addEventListener('click', () => {
        iosModal.classList.add('hidden');
    });

    if (isStandalone) {
        pwaModal.classList.add('hidden');
        iosModal.classList.add('hidden');
    }
});
