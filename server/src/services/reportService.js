const pool = require('../config/database');

const getDashboardReport = async () => {
  const query = `
    SELECT
      COUNT(*)::INTEGER AS total_products,
      COALESCE(SUM(stock), 0)::BIGINT AS total_stock,
      COUNT(*) FILTER (WHERE status = 'LAYAK_JUAL')::INTEGER AS layak_jual,
      COUNT(*) FILTER (WHERE status = 'MENDEKATI_EXPIRED')::INTEGER AS mendekati_expired,
      COUNT(*) FILTER (WHERE status = 'EXPIRED')::INTEGER AS expired
    FROM products
  `;

  const result = await pool.query(query);
  const row = result.rows[0];

  return {
    totalProducts: Number(row.total_products),
    totalStock: Number(row.total_stock),
    layakJual: Number(row.layak_jual),
    mendekatiExpired: Number(row.mendekati_expired),
    expired: Number(row.expired),
  };
};

const getStockHistory = async ({
  page = 1,
  limit = 10,
  type,
  productId,
  from,
  to,
}) => {
  const conditions = [];
  const values = [];

  const addCondition = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (type) addCondition('st.type = ?', type);
  if (productId) addCondition('st.product_id = ?', productId);
  if (from) addCondition('st.created_at >= ?::date', from);
  if (to) addCondition("st.created_at < (?::date + INTERVAL '1 day')", to);

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countQuery = `
    SELECT COUNT(*)::INTEGER AS total
    FROM stock_transactions st
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = Number(countResult.rows[0].total);
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];
  const dataQuery = `
    SELECT
      st.id,
      st.uuid,
      st.type,
      st.quantity,
      st.description,
      st.created_at,
      p.id AS product_id,
      p.name AS product_name,
      u.id AS created_by_id,
      u.full_name AS created_by_name,
      u.email AS created_by_email
    FROM stock_transactions st
    INNER JOIN products p ON p.id = st.product_id
    LEFT JOIN users u ON u.id = st.created_by
    ${whereClause}
    ORDER BY st.created_at DESC, st.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const result = await pool.query(dataQuery, dataValues);
  const items = result.rows.map((row) => ({
    id: row.id,
    uuid: row.uuid,
    type: row.type,
    quantity: row.quantity,
    description: row.description,
    createdAt: row.created_at,
    product: {
      id: row.product_id,
      name: row.product_name,
    },
    createdBy: row.created_by_id
      ? {
          id: row.created_by_id,
          name: row.created_by_name,
          email: row.created_by_email,
        }
      : null,
  }));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

module.exports = { getDashboardReport, getStockHistory };
