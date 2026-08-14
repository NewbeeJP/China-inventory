export type TransactionType = 'inbound' | 'outbound' | 'order';

export interface Product {
  id: number;
  name_cn: string;
  name_en: string | null;
  material: string | null;
  sku: string | null;
  box_qty: number | null;
  ctn: number | null;
  net_weight: number | null;
  gross_weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  cbm: number | null;
  price_jpy: number | null;
  price_rmb: number | null;
  reorder_point: number | null;
  opening_stock: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  latest_date: string | null;
  latest_type: TransactionType | null;
  latest_quantity: number | null;
}

export interface Batch {
  id: number;
  name: string;
  type: TransactionType;
  date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  product_id: number;
  batch_id: number | null;
  type: TransactionType;
  quantity: number;
  date: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TransactionWithProduct extends Transaction {
  product: Pick<Product, 'id' | 'name_cn' | 'sku'>;
  batch: Pick<Batch, 'id' | 'name'> | null;
}

// 批次明细行：算汇总要用到商品的箱规、重量、体积和单价
export interface BatchLine extends Transaction {
  product: Pick<
    Product,
    'id' | 'name_cn' | 'sku' | 'box_qty' | 'net_weight' | 'gross_weight' | 'cbm' | 'price_jpy' | 'price_rmb'
  >;
}

export interface ExchangeRate {
  id: number;
  rmb_to_jpy: number;
  updated_by: string | null;
  updated_at: string;
}

export type NewProduct = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type NewTransaction = Omit<Transaction, 'id' | 'created_at' | 'created_by'>;
export type NewBatch = Omit<Batch, 'id' | 'created_at' | 'created_by'>;
