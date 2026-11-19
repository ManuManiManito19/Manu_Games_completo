require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql/msnodesqlv8'); 

const app = express();
app.use(cors());
app.use(express.json());

// Actualizamos al Driver moderno (ODBC 17) y forzamos la confianza en el certificado
const connectionString = `Server=${process.env.DB_SERVER};Database=${process.env.DB_NAME};Trusted_Connection=yes;Driver={ODBC Driver 17 for SQL Server};TrustServerCertificate=yes;`;

// ENDPOINT 1: Obtener el catálogo de juegos
app.get('/api/juegos', async (req, res) => {
    try {
        let pool = await sql.connect(connectionString);
        
        let result = await pool.request().query(`
            SELECT 
                j.JuegoId AS id,
                j.Titulo AS titulo,
                j.Precio AS precio,
                c.Nombre AS categoria,
                j.Descripcion AS descripcion,
                j.Imagen AS imagen,
                j.Stock AS stock,
                j.Plataforma AS plataforma
            FROM Juegos j
            INNER JOIN Categorias c ON j.CategoriaId = c.CategoriaId
        `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error("Error al consultar la base de datos:", err);
        // Si hay error, ahora lo imprimirá en el navegador para detectarlo de inmediato
        res.status(500).json({ 
            error: "Error interno del servidor", 
            detalle: err.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`>_ SERVIDOR MANU_GAMES ACTIVO EN EL PUERTO ${PORT}`);
    console.log(`>_ ESPERANDO CONEXIÓN A BASE DE DATOS...`);
});