-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create almacenes table
CREATE TABLE public.almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ubicacion TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view almacenes"
  ON public.almacenes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage almacenes"
  ON public.almacenes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create equipos table
CREATE TABLE public.equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_equipo TEXT UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  modelo TEXT,
  marca TEXT,
  anio INTEGER,
  serie TEXT,
  clase TEXT,
  categoria TEXT,
  almacen_id UUID REFERENCES public.almacenes(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipos"
  ON public.equipos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage equipos"
  ON public.equipos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create contratos table
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_contrato TEXT UNIQUE NOT NULL,
  numero_contrato TEXT,
  equipo_id UUID REFERENCES public.equipos(id) ON DELETE SET NULL,
  cliente TEXT NOT NULL,
  comprador TEXT,
  obra TEXT,
  vendedor TEXT,
  comentarios TEXT,
  dentro_fuera TEXT,
  horas_trabajo INTEGER DEFAULT 0,
  suma DECIMAL(10,2),
  fecha_inicio DATE,
  dias_contratado INTEGER,
  fecha_vencimiento DATE,
  status TEXT DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contratos"
  ON public.contratos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage contratos"
  ON public.contratos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create entradas_salidas table
CREATE TABLE public.entradas_salidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'traspaso')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  equipo_id UUID REFERENCES public.equipos(id),
  cliente TEXT,
  obra TEXT,
  serie TEXT,
  modelo TEXT,
  chofer TEXT,
  transporte TEXT,
  comentarios TEXT,
  almacen_origen_id UUID REFERENCES public.almacenes(id),
  almacen_destino_id UUID REFERENCES public.almacenes(id),
  firma_aceptacion_url TEXT,
  firma_liberacion_url TEXT,
  fotografia_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.entradas_salidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entradas_salidas"
  ON public.entradas_salidas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage entradas_salidas"
  ON public.entradas_salidas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create mantenimientos table
CREATE TABLE public.mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  equipo_id UUID REFERENCES public.equipos(id) NOT NULL,
  tipo_servicio TEXT NOT NULL CHECK (tipo_servicio IN ('mantenimiento', 'reparacion')),
  orden_servicio TEXT,
  tecnico TEXT,
  descripcion TEXT NOT NULL,
  proximo_servicio DATE,
  firma_aceptacion_url TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mantenimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mantenimientos"
  ON public.mantenimientos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage mantenimientos"
  ON public.mantenimientos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage buckets for signatures and photos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('firmas', 'firmas', true),
  ('fotografias', 'fotografias', true);

-- Storage policies for firmas bucket
CREATE POLICY "Authenticated users can upload firmas"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'firmas');

CREATE POLICY "Authenticated users can view firmas"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'firmas');

CREATE POLICY "Admins can delete firmas"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'firmas' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for fotografias bucket
CREATE POLICY "Authenticated users can upload fotografias"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotografias');

CREATE POLICY "Authenticated users can view fotografias"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'fotografias');

CREATE POLICY "Admins can delete fotografias"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'fotografias' AND public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_equipos_updated_at
  BEFORE UPDATE ON public.equipos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();