--
-- PostgreSQL database dump
--

\restrict FfI5wfrPckThJrinGE3HUtmktQpZgNSgo2ZSBsx2ZZhflvT6xstHguyDefoiW7w

-- Dumped from database version 16.12 (6d3029c)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO neondb_owner;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    product_id integer NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    reference_type text,
    reference_id integer,
    date timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_transactions OWNER TO neondb_owner;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: product_compatibility; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product_compatibility (
    id integer NOT NULL,
    product_id integer NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year_start integer,
    year_end integer
);


ALTER TABLE public.product_compatibility OWNER TO neondb_owner;

--
-- Name: product_compatibility_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.product_compatibility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_compatibility_id_seq OWNER TO neondb_owner;

--
-- Name: product_compatibility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.product_compatibility_id_seq OWNED BY public.product_compatibility.id;


--
-- Name: product_oem_numbers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product_oem_numbers (
    id integer NOT NULL,
    product_id integer NOT NULL,
    oem_number text NOT NULL
);


ALTER TABLE public.product_oem_numbers OWNER TO neondb_owner;

--
-- Name: product_oem_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.product_oem_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_oem_numbers_id_seq OWNER TO neondb_owner;

--
-- Name: product_oem_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.product_oem_numbers_id_seq OWNED BY public.product_oem_numbers.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id integer NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    brand text,
    stock_quantity integer DEFAULT 0 NOT NULL,
    reorder_point integer DEFAULT 5 NOT NULL,
    cost_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    selling_price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    location text,
    image_url text
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer NOT NULL,
    product_id integer,
    quantity integer NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    description text
);


ALTER TABLE public.purchase_order_items OWNER TO neondb_owner;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_order_items_id_seq OWNER TO neondb_owner;

--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    order_date timestamp without time zone DEFAULT now(),
    total_amount numeric(10,2) DEFAULT '0'::numeric
);


ALTER TABLE public.purchase_orders OWNER TO neondb_owner;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO neondb_owner;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_items (
    id integer NOT NULL,
    sales_order_id integer NOT NULL,
    product_id integer,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    description text
);


ALTER TABLE public.sales_order_items OWNER TO neondb_owner;

--
-- Name: sales_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sales_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_order_items_id_seq OWNER TO neondb_owner;

--
-- Name: sales_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sales_order_items_id_seq OWNED BY public.sales_order_items.id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    order_date timestamp without time zone DEFAULT now(),
    total_amount numeric(10,2) DEFAULT '0'::numeric,
    payment_status text DEFAULT 'unpaid'::text
);


ALTER TABLE public.sales_orders OWNER TO neondb_owner;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_orders_id_seq OWNER TO neondb_owner;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    username character varying NOT NULL,
    password character varying NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    lead_time_days integer DEFAULT 0
);


ALTER TABLE public.vendors OWNER TO neondb_owner;

--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_id_seq OWNER TO neondb_owner;

--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: product_compatibility id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_compatibility ALTER COLUMN id SET DEFAULT nextval('public.product_compatibility_id_seq'::regclass);


--
-- Name: product_oem_numbers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_oem_numbers ALTER COLUMN id SET DEFAULT nextval('public.product_oem_numbers_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: sales_order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items ALTER COLUMN id SET DEFAULT nextval('public.sales_order_items_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, name, email, phone, address) FROM stdin;
1	CASH PAYMENT	\N	\N	1032 A. BONIFACIO ST.
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_transactions (id, product_id, type, quantity, reference_type, reference_id, date) FROM stdin;
\.


--
-- Data for Name: product_compatibility; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.product_compatibility (id, product_id, make, model, year_start, year_end) FROM stdin;
\.


--
-- Data for Name: product_oem_numbers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.product_oem_numbers (id, product_id, oem_number) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, sku, name, description, category, brand, stock_quantity, reorder_point, cost_price, selling_price, location, image_url) FROM stdin;
1	BF-0001	BRAKE FLUID NATIONAL	\N	CONSUMABLES	NATIONAL	24	5	180.00	250.00	SHELF 1 - A.BONIFACIO	/uploads/product-1770824259623-699644242.png
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_items (id, purchase_order_id, product_id, quantity, unit_cost, description) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_orders (id, vendor_id, status, order_date, total_amount) FROM stdin;
\.


--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_items (id, sales_order_id, product_id, quantity, unit_price, description) FROM stdin;
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_orders (id, customer_id, status, order_date, total_amount, payment_status) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
pJLkAMIMIDfExmsHgfMGV7O3l6-2WDk2	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T12:00:19.967Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "userId": "2c4fe6fb-f1b4-4e26-b5ea-5be15ed513d3"}	2026-02-19 04:25:06
AfjZK5GZOv9nddhlrIKUSTEvghIK6Hrx	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-18T13:19:46.597Z", "httpOnly": true, "sameSite": "lax", "originalMaxAge": 604800000}, "userId": "2c4fe6fb-f1b4-4e26-b5ea-5be15ed513d3"}	2026-02-18 13:22:25
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at, username, password) FROM stdin;
2c4fe6fb-f1b4-4e26-b5ea-5be15ed513d3	\N	BEN	BAGALIHOG	\N	2026-02-11 11:34:12.140677	2026-02-11 11:34:12.140677	TTPS	$2b$10$N495yQazaaQKNXMEzzlaPefHTV4ERAol6TcCdit6pp/37I9Sr2H0W
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vendors (id, name, email, phone, address, lead_time_days) FROM stdin;
1	T.Y. ENTERPRISE	\N	\N	\N	7
2	ZYY TRUCK PARTS TRADING\t	\N	0917 187 7772	1362 Rizal Ave Ext, 109, Caloocan, 1400 Metro Manila	7
3	W.M.J.Y Auto Supply	\N	(077) 834 5871	Quezon City, Metro Manila	7
4	ALLSOURCE TRUCK PARTS	\N	\N	A. BONIFACIO ST. Q.C.	7
\.


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, true);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 1, false);


--
-- Name: product_compatibility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.product_compatibility_id_seq', 1, false);


--
-- Name: product_oem_numbers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.product_oem_numbers_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.products_id_seq', 1, true);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 1, true);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, true);


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sales_order_items_id_seq', 1, false);


--
-- Name: sales_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.sales_orders_id_seq', 1, false);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.vendors_id_seq', 4, true);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: product_compatibility product_compatibility_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_compatibility
    ADD CONSTRAINT product_compatibility_pkey PRIMARY KEY (id);


--
-- Name: product_oem_numbers product_oem_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_oem_numbers
    ADD CONSTRAINT product_oem_numbers_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: inventory_transactions inventory_transactions_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_compatibility product_compatibility_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_compatibility
    ADD CONSTRAINT product_compatibility_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_oem_numbers product_oem_numbers_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_oem_numbers
    ADD CONSTRAINT product_oem_numbers_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_order_items purchase_order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: sales_order_items sales_order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales_order_items sales_order_items_sales_order_id_sales_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_sales_order_id_sales_orders_id_fk FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: sales_orders sales_orders_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict FfI5wfrPckThJrinGE3HUtmktQpZgNSgo2ZSBsx2ZZhflvT6xstHguyDefoiW7w

