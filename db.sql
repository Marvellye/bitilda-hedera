CREATE TABLE public.chat_history (
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id integer NOT NULL,
  id integer NOT NULL,
  role text NOT NULL,
  content text NOT NULL
);
CREATE TABLE public.loans (
  wallet_id bigint NOT NULL,
  amount_ngn numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id bigint NOT NULL,
  due_date timestamp with time zone NOT NULL,
  id bigint NOT NULL,
  amount_usdc numeric NOT NULL,
  status text DEFAULT 'locked'::text NOT NULL,
  bank_code text NOT NULL,
  bank_account text NOT NULL,
  chain text NOT NULL
);
CREATE TABLE public.message_events (
  created_at timestamp with time zone DEFAULT now(),
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text NOT NULL,
  user_id text,
  message_id text NOT NULL
);

CREATE TABLE public.onRamp (
  user_id integer,
  wallet_address text,
  naira_amount text,
  usdt_amount text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'pending'::text,
  id bigint NOT NULL,
  trx_ref text
);
CREATE TABLE public.pending_sends (
  to_address text NOT NULL,
  id bigint DEFAULT nextval('pending_sends_id_seq'::regclass) NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id text NOT NULL,
  chain text NOT NULL,
  token_symbol text DEFAULT 'NATIVE'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL
);
CREATE TABLE public.processed_hedera_txs (
  processed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  tx_hash text NOT NULL,
  amount numeric,
  wallet_id bigint
);
CREATE TABLE public.transactions (
  wallet_id bigint,
  user_id bigint,
  id bigint DEFAULT nextval('transactions_id_seq'::regclass) NOT NULL,
  chain text NOT NULL,
  token_symbol text DEFAULT 'NATIVE'::text,
  tx_hash text NOT NULL,
  status text DEFAULT 'confirmed'::text,
  from_address text NOT NULL,
  to_address text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  amount numeric NOT NULL
);
CREATE TABLE public.users (
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  id bigint NOT NULL,
  is_premium boolean DEFAULT true,
  phone text NOT NULL,
  email text
);
CREATE TABLE public.wallets (
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  multi_addresses jsonb DEFAULT '{}'::jsonb,
  hbar_balance numeric DEFAULT 0.0,
  user_id bigint,
  private_key text,
  id bigint NOT NULL,
  address text,
  mnemonic_phrase text,
  hedera_memo text
);
