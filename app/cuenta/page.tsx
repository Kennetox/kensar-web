"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  useWebCustomer,
} from "@/app/components/WebCustomerProvider";
import { useWebCart } from "@/app/components/WebCartProvider";

type AuthMode = "login" | "register";

type LoginFormState = {
  email: string;
  password: string;
};

type RegisterFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  tax_id: string;
  address: string;
};

const emptyLoginForm: LoginFormState = {
  email: "",
  password: "",
};

const emptyRegisterForm: RegisterFormState = {
  name: "",
  email: "",
  phone: "",
  password: "",
  tax_id: "",
  address: "",
};

export default function CuentaPage() {
  const { authenticated, customer, loading, login, register, logout } = useWebCustomer();
  const { orders, ordersLoading } = useWebCart();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(emptyRegisterForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const profileFacts = useMemo(
    () =>
      customer
        ? [
            { label: "Correo", value: customer.email },
            { label: "Teléfono", value: customer.phone || "Pendiente de registrar" },
            { label: "Documento", value: customer.tax_id || "Pendiente de registrar" },
            { label: "Dirección", value: customer.address || "Pendiente de registrar" },
          ]
        : [],
    [customer]
  );

  function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      try {
        await login(loginForm);
        setLoginForm(emptyLoginForm);
        setFormSuccess("Sesión iniciada. Tu cuenta ya quedó conectada con Metrik.");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      }
    });
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (registerForm.password.trim().length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        await register({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          phone: registerForm.phone || undefined,
          tax_id: registerForm.tax_id || undefined,
          address: registerForm.address || undefined,
        });
        setRegisterForm(emptyRegisterForm);
        setMode("login");
        setFormSuccess("Cuenta creada. Ya puedes operar tu canal web con sesión activa.");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo crear la cuenta.");
      }
    });
  }

  function handleLogout() {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      try {
        await logout();
        setFormSuccess("Sesión cerrada correctamente.");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo cerrar la sesión.");
      }
    });
  }

  return (
    <main className="site-shell internal-page section-space account-page-shell">
      <section className="page-hero account-page-hero">
        <div>
          <p className="section-label">Cuenta cliente</p>
          <h1 className="page-title">Tu cuenta para comprar, seguir pedidos y guardar tu proceso en Kensar.</h1>
          <p className="section-intro">
            Inicia sesión o crea tu cuenta para consultar pedidos, continuar tu carrito y gestionar tu compra desde la web de Kensar.
          </p>
          <div className="account-status-strip">
            <span className={`account-status-pill${authenticated ? " is-authenticated" : ""}`}>
              {loading ? "Verificando sesión" : authenticated ? "Sesión activa" : "Invitado"}
            </span>
            <p>
              {loading
                ? "Estamos validando tu sesión actual."
                : authenticated
                  ? "Ya puedes seguir tus órdenes, gestionar el carrito y continuar tu compra."
                  : "Inicia sesión o crea tu cuenta para guardar tu proceso de compra."}
            </p>
          </div>
        </div>
      </section>

      {formError ? <p className="account-feedback error">{formError}</p> : null}
      {formSuccess ? <p className="account-feedback success">{formSuccess}</p> : null}

      {loading ? (
        <section className="account-loading-card">
          <p>Consultando tu sesión actual…</p>
        </section>
      ) : authenticated && customer ? (
        <section className="account-dashboard-grid">
          <article className="account-card">
            <p className="account-section-kicker">Perfil conectado</p>
            <h2>{customer.name}</h2>
            <p className="account-section-copy">
              Esta cuenta web está vinculada al cliente maestro #{customer.pos_customer_id} en Metrik.
            </p>
            <div className="account-facts">
              {profileFacts.map((item) => (
                <div key={item.label} className="account-fact-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="account-action-row">
              <button type="button" onClick={handleLogout} disabled={isPending} className="account-primary-btn">
                {isPending ? "Procesando..." : "Cerrar sesión"}
              </button>
              <Link href="/carrito" className="account-secondary-btn">
                Ver carrito
              </Link>
              <Link href="/catalogo" className="account-secondary-btn">
                Ir al catálogo
              </Link>
            </div>
          </article>

          <article className="account-card">
            <p className="account-section-kicker">Órdenes y operación</p>
            <h2>Tu historial web inicial</h2>
            <p className="account-section-copy">
              Desde aquí ya puedes seguir las órdenes web que has creado en Kensar y entrar a su
              confirmación individual.
            </p>
            <div className="account-orders-list">
              {ordersLoading ? (
                <p className="account-section-copy">Cargando órdenes…</p>
              ) : orders.length === 0 ? (
                <p className="account-section-copy">
                  Aún no has creado órdenes web desde esta cuenta.
                </p>
              ) : (
                orders.slice(0, 4).map((order) => (
                  <Link key={order.id} href={`/ordenes/${order.id}`} className="account-order-link">
                    <div>
                      <strong>{order.document_number || `Orden #${order.id}`}</strong>
                      <span>{order.status} · pago {order.payment_status}</span>
                    </div>
                    <small>{new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(order.total)}</small>
                  </Link>
                ))
              )}
            </div>
            <div className="account-action-row">
              <Link href="/carrito" className="account-secondary-btn">
                Continuar compra
              </Link>
              <Link href="/catalogo" className="account-secondary-btn">
                Seguir viendo productos
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <section className="account-auth-grid account-auth-grid-single">
          <article className="account-card">
            <div className="account-mode-switch">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
              >
                Ingresar
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
              >
                Crear cuenta
              </button>
            </div>

            {mode === "login" ? (
              <form className="account-form" onSubmit={handleLoginSubmit}>
                <label>
                  <span>Correo</span>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Contraseña</span>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" disabled={isPending} className="account-primary-btn">
                  {isPending ? "Ingresando..." : "Entrar a mi cuenta"}
                </button>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleRegisterSubmit}>
                <label>
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    required
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <div className="account-form-grid">
                  <label>
                    <span>Correo</span>
                    <input
                      type="email"
                      required
                      value={registerForm.email}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      value={registerForm.phone}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="account-form-grid">
                  <label>
                    <span>Contraseña</span>
                    <input
                      type="password"
                      minLength={8}
                      required
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Documento</span>
                    <input
                      type="text"
                      value={registerForm.tax_id}
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, tax_id: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Dirección</span>
                  <input
                    type="text"
                    value={registerForm.address}
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </label>
                <button type="submit" disabled={isPending} className="account-primary-btn">
                  {isPending ? "Creando..." : "Crear cuenta conectada"}
                </button>
              </form>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
