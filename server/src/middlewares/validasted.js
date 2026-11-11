// middleware/validate.js

const validateProduct = (req, res, next) => {
    const { name, category, stock, expired_date } = req.body;
    
    if (!name || !category || stock === undefined || !expired_date) {
        return res.status(400).json({
            success: false,
            message: "Validasi gagal: Semua field (name, category, stock, expired_date) wajib diisi."
        });
    }

    if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
            success: false,
            message: "Validasi gagal: Nilai stok harus berupa angka dan minimal 0."
        });
    }

    next();
};

const validateAuth = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Validasi gagal: Email dan password wajib diisi."
        });
    }

    next();
};

module.exports = {
    validateProduct,
    validateAuth
};