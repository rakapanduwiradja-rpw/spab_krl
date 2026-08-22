import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    isBluetoothSupported,
    pairPrinter,
    printBytes,
    getSavedPrinter,
    savePrinterInfo,
    removeSavedPrinter,
    buildNotaBytes,
} from '../lib/bluetoothPrinter';

const BluetoothPrinterContext = createContext(null);

export function BluetoothPrinterProvider({ children }) {
    const [printerInfo, setPrinterInfo] = useState(null); // { name, id }
    const [btDevice, setBtDevice] = useState(null);       // BluetoothDevice object
    const [status, setStatus] = useState('idle');          // idle | pairing | ready | printing | error
    const [errorMsg, setErrorMsg] = useState('');
    const [supported, setSupported] = useState(true);

    useEffect(() => {
        setSupported(isBluetoothSupported());
        const saved = getSavedPrinter();
        if (saved) setPrinterInfo(saved);
    }, []);

    const pair = async () => {
        setStatus('pairing');
        setErrorMsg('');
        try {
            const result = await pairPrinter();
            savePrinterInfo({ name: result.name, id: result.id });
            setPrinterInfo({ name: result.name, id: result.id });
            setBtDevice(result.device);
            setStatus('ready');
            return true;
        } catch (err) {
            const msg = err?.message || 'Gagal pair printer';
            setErrorMsg(msg.includes('cancelled') || msg.includes('No device') ? 'Tidak ada perangkat dipilih' : msg);
            setStatus('error');
            return false;
        }
    };

    const forget = () => {
        removeSavedPrinter();
        setPrinterInfo(null);
        setBtDevice(null);
        setStatus('idle');
        setErrorMsg('');
    };

    /**
     * Cetak nota tagihan.
     * Jika btDevice belum ada (page refresh), minta pair ulang.
     */
    const printNota = async (tagihan, pelanggan, pengaturan) => {
        if (!supported) {
            throw new Error('Web Bluetooth tidak didukung. Gunakan Chrome/Edge.');
        }

        let dev = btDevice;

        if (!dev || !printerInfo) {
            // Tidak ada device di memory (misal setelah refresh), minta pair ulang
            setStatus('pairing');
            setErrorMsg('');
            try {
                const result = await pairPrinter();
                savePrinterInfo({ name: result.name, id: result.id });
                setPrinterInfo({ name: result.name, id: result.id });
                setBtDevice(result.device);
                dev = result.device;
            } catch (err) {
                const msg = err?.message || 'Gagal konek printer';
                setErrorMsg(msg.includes('cancelled') || msg.includes('No device') ? 'Tidak ada perangkat dipilih' : msg);
                setStatus('error');
                throw new Error(errorMsg || msg);
            }
        }

        setStatus('printing');
        setErrorMsg('');
        try {
            const bytes = buildNotaBytes(tagihan, pelanggan, pengaturan);
            await printBytes(dev, bytes);
            setStatus('ready');
        } catch (err) {
            setErrorMsg(err?.message || 'Gagal cetak');
            setStatus('error');
            // Reset device — mungkin koneksi putus
            setBtDevice(null);
            throw err;
        }
    };

    return (
        <BluetoothPrinterContext.Provider value={{
            printerInfo,
            btDevice,
            status,
            errorMsg,
            supported,
            pair,
            forget,
            printNota,
            isConnected: !!printerInfo,
            isPrinting: status === 'printing',
            isPairing: status === 'pairing',
        }}>
            {children}
        </BluetoothPrinterContext.Provider>
    );
}

export function useBluetoothPrinter() {
    const ctx = useContext(BluetoothPrinterContext);
    if (!ctx) throw new Error('useBluetoothPrinter must be inside BluetoothPrinterProvider');
    return ctx;
}
