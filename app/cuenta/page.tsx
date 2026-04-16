"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useWebCustomer,
} from "@/app/components/WebCustomerProvider";
import AccountSectionTabs from "@/app/components/AccountSectionTabs";

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
  confirm_password: string;
  tax_id: string;
  address: string;
};

type ProfileFormState = {
  first_name: string;
  last_name: string;
  phone: string;
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
  confirm_password: "",
  tax_id: "",
  address: "",
};

const emptyProfileForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  phone: "",
  tax_id: "",
  address: "",
};

function splitCustomerName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function buildProfileFormFromCustomer(customer: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
} | null): ProfileFormState {
  if (!customer) return emptyProfileForm;
  const fallbackName = splitCustomerName(customer.name);
  return {
    first_name: (customer.first_name || "").trim() || fallbackName.first_name,
    last_name: (customer.last_name || "").trim() || fallbackName.last_name,
    phone: customer.phone || "",
    tax_id: customer.tax_id || "",
    address: customer.address || "",
  };
}

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.1 0 8.7 4.5 9.8 7-0.5 1-1.4 2.5-2.8 3.8" />
        <path d="M14.1 18.8a10.7 10.7 0 0 1-2.1.2c-5.1 0-8.7-4.5-9.8-7 0.6-1.2 1.8-3 3.8-4.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.2 12s3.6-7 9.8-7 9.8 7 9.8 7-3.6 7-9.8 7-9.8-7-9.8-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CuentaPageContent() {
  const { authenticated, customer, loading, login, register, updateProfile, logout } = useWebCustomer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterFormState>(emptyRegisterForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [isPending, startTransition] = useTransition();
  const isGuestView = !loading && !(authenticated && customer);

  const profileFacts = useMemo(
    () =>
      customer
        ? [
            {
              label: "Nombre",
              value:
                (customer.first_name || "").trim() ||
                splitCustomerName(customer.name).first_name ||
                "Pendiente de registrar",
            },
            {
              label: "Apellidos",
              value:
                (customer.last_name || "").trim() ||
                splitCustomerName(customer.name).last_name ||
                "Pendiente de registrar",
            },
            { label: "Correo", value: customer.email },
            { label: "Teléfono", value: customer.phone || "Pendiente de registrar" },
            { label: "Documento", value: customer.tax_id || "Pendiente de registrar" },
            { label: "Dirección", value: customer.address || "Pendiente de registrar" },
          ]
        : [],
    [customer]
  );

  function resolveSafeReturnPath() {
    const returnTo = searchParams.get("returnTo")?.trim();
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/cuenta")) {
      return returnTo;
    }

    if (typeof window === "undefined") {
      return "/";
    }

    const previousUrl = document.referrer;
    if (!previousUrl) {
      return "/";
    }

    try {
      const parsed = new URL(previousUrl);
      const sameOrigin = parsed.origin === window.location.origin;
      const cameFromCuenta = parsed.pathname.startsWith("/cuenta");
      if (sameOrigin && !cameFromCuenta) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Si la URL previa no es válida, hacemos fallback al inicio.
    }

    return "/";
  }

  function redirectAfterAuthSuccess() {
    const target = resolveSafeReturnPath();
    router.replace(target);
  }

  function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      try {
        await login(loginForm);
        setLoginForm(emptyLoginForm);
        setFormSuccess("Sesión iniciada correctamente.");
        redirectAfterAuthSuccess();
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
      }
    });
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const normalizedName = registerForm.name.trim();
    const normalizedEmail = registerForm.email.trim().toLowerCase();

    if (!normalizedName) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    if (!normalizedEmail) {
      setFormError("El correo es obligatorio.");
      return;
    }

    if (registerForm.password.trim().length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (registerForm.password !== registerForm.confirm_password) {
      setFormError("La confirmación de contraseña no coincide.");
      return;
    }

    startTransition(async () => {
      try {
        await register({
          name: normalizedName,
          email: normalizedEmail,
          password: registerForm.password,
          phone: registerForm.phone.trim() || undefined,
          tax_id: registerForm.tax_id.trim() || undefined,
          address: registerForm.address.trim() || undefined,
        });
        setRegisterForm(emptyRegisterForm);
        setMode("login");
        setFormSuccess("Cuenta creada. Ya puedes operar tu canal web con sesión activa.");
        redirectAfterAuthSuccess();
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

  function handleProfileCancel() {
    if (!customer) return;
    setProfileForm(buildProfileFormFromCustomer(customer));
    setProfileEditing(false);
  }

  function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const nextFirstName = profileForm.first_name.trim();
    if (!nextFirstName) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        await updateProfile({
          first_name: nextFirstName,
          last_name: profileForm.last_name.trim(),
          phone: profileForm.phone.trim(),
          tax_id: profileForm.tax_id.trim(),
          address: profileForm.address.trim(),
        });
        setProfileEditing(false);
        setFormSuccess("Datos de perfil actualizados correctamente.");
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
      }
    });
  }

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="catalog-breadcrumbs">
        <span>Cuenta</span>
        <span>Mi cuenta</span>
      </section>

      <AccountSectionTabs />

      <section className="cart-intro-card">
        <div className="cart-intro-copy">
          <p className="section-label">Cuenta cliente</p>
          <h1 className="page-title">Perfil y datos personales</h1>
          <p className="section-intro">
            Gestiona tu información de contacto para mantener tu proceso de compra actualizado.
          </p>
        </div>
      </section>

      {isGuestView ? (
        <>
          {formError ? <p className="account-feedback error">{formError}</p> : null}
          {formSuccess ? <p className="account-feedback success">{formSuccess}</p> : null}

          <section className="account-guest-auth-layout">
            <article className="account-guest-auth-copy">
              <h1>Ingresa tu e-mail o teléfono para iniciar sesión</h1>
              <p className="account-section-copy">
                Accede para continuar compras, revisar pedidos y guardar tu proceso en Kensar.
              </p>
            </article>

            <article className="account-card account-auth-card-wide">
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
                    <div className="account-password-input-wrap">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        required
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowLoginPassword((current) => !current)}
                        aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        title={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        <PasswordVisibilityIcon visible={showLoginPassword} />
                      </button>
                    </div>
                  </label>
                  <button type="submit" disabled={isPending} className="account-primary-btn">
                    {isPending ? "Ingresando..." : "Entrar a mi cuenta"}
                  </button>
                </form>
              ) : (
                <form className="account-form" onSubmit={handleRegisterSubmit}>
                  <label>
                    <span>Nombre completo <strong className="account-required-asterisk">*</strong></span>
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
                      <span>Correo <strong className="account-required-asterisk">*</strong></span>
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
                      <span>Contraseña <strong className="account-required-asterisk">*</strong></span>
                      <div className="account-password-input-wrap">
                        <input
                          type={showRegisterPassword ? "text" : "password"}
                          minLength={8}
                          required
                          value={registerForm.password}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, password: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="account-password-toggle"
                          onClick={() => setShowRegisterPassword((current) => !current)}
                          aria-label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          title={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          <PasswordVisibilityIcon visible={showRegisterPassword} />
                        </button>
                      </div>
                    </label>
                    <label>
                      <span>Confirmar contraseña <strong className="account-required-asterisk">*</strong></span>
                      <div className="account-password-input-wrap">
                        <input
                          type={showRegisterConfirmPassword ? "text" : "password"}
                          minLength={8}
                          required
                          value={registerForm.confirm_password}
                          onChange={(event) =>
                            setRegisterForm((current) => ({ ...current, confirm_password: event.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="account-password-toggle"
                          onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                          aria-label={showRegisterConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                          title={showRegisterConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                        >
                          <PasswordVisibilityIcon visible={showRegisterConfirmPassword} />
                        </button>
                      </div>
                    </label>
                  </div>
                  <div className="account-form-grid">
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
                  </div>
                  <button type="submit" disabled={isPending} className="account-primary-btn">
                    {isPending ? "Creando..." : "Crear cuenta"}
                  </button>
                </form>
              )}
            </article>
          </section>
        </>
      ) : (
        <>
          {formError ? <p className="account-feedback error">{formError}</p> : null}
          {formSuccess ? <p className="account-feedback success">{formSuccess}</p> : null}
        </>
      )}

      {loading ? (
        <section className="account-loading-card">
          <p>Consultando tu sesión actual…</p>
        </section>
      ) : authenticated && customer ? (
        <section className="account-auth-grid account-auth-grid-single">
          <article className="account-card">
            <p className="account-section-kicker">Perfil conectado</p>
            <h2>{customer.name}</h2>
            {profileEditing ? (
              <form className="account-form account-profile-form" onSubmit={handleProfileSubmit}>
                <div className="account-form-grid">
                  <label>
                    <span>Nombre <strong className="account-required-asterisk">*</strong></span>
                    <input
                      type="text"
                      required
                      value={profileForm.first_name}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, first_name: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Apellidos</span>
                    <input
                      type="text"
                      value={profileForm.last_name}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, last_name: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Correo</span>
                  <input type="email" value={customer.email} disabled />
                </label>
                <div className="account-form-grid">
                  <label>
                    <span>Teléfono</span>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Documento</span>
                    <input
                      type="text"
                      value={profileForm.tax_id}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, tax_id: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Dirección</span>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </label>
                <div className="account-action-row">
                  <button type="submit" disabled={isPending} className="account-primary-btn">
                    {isPending ? "Guardando..." : "Guardar datos"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    className="account-secondary-btn"
                    onClick={handleProfileCancel}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="account-facts">
                  {profileFacts.map((item) => (
                    <div key={item.label} className="account-fact-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="account-inline-actions">
                  <button
                    type="button"
                    className="account-secondary-btn"
                    onClick={() => {
                      setProfileForm(buildProfileFormFromCustomer(customer));
                      setProfileEditing(true);
                    }}
                  >
                    Editar datos
                  </button>
                </div>
              </>
            )}
            <div className="account-action-row">
              <button type="button" onClick={handleLogout} disabled={isPending} className="account-primary-btn">
                {isPending ? "Procesando..." : "Cerrar sesión"}
              </button>
            </div>
          </article>
        </section>
      ) : isGuestView ? null : (
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
                  <div className="account-password-input-wrap">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, password: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="account-password-toggle"
                      onClick={() => setShowLoginPassword((current) => !current)}
                      aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <PasswordVisibilityIcon visible={showLoginPassword} />
                    </button>
                  </div>
                </label>
                <button type="submit" disabled={isPending} className="account-primary-btn">
                  {isPending ? "Ingresando..." : "Entrar a mi cuenta"}
                </button>
              </form>
            ) : (
              <form className="account-form" onSubmit={handleRegisterSubmit}>
                <label>
                  <span>Nombre completo <strong className="account-required-asterisk">*</strong></span>
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
                    <span>Correo <strong className="account-required-asterisk">*</strong></span>
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
                    <span>Contraseña <strong className="account-required-asterisk">*</strong></span>
                    <div className="account-password-input-wrap">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        minLength={8}
                        required
                        value={registerForm.password}
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowRegisterPassword((current) => !current)}
                        aria-label={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        title={showRegisterPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        <PasswordVisibilityIcon visible={showRegisterPassword} />
                      </button>
                    </div>
                  </label>
                  <label>
                    <span>Confirmar contraseña <strong className="account-required-asterisk">*</strong></span>
                    <div className="account-password-input-wrap">
                      <input
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        minLength={8}
                        required
                        value={registerForm.confirm_password}
                        onChange={(event) =>
                          setRegisterForm((current) => ({ ...current, confirm_password: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="account-password-toggle"
                        onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                        aria-label={showRegisterConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                        title={showRegisterConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"}
                      >
                        <PasswordVisibilityIcon visible={showRegisterConfirmPassword} />
                      </button>
                    </div>
                  </label>
                </div>
                <div className="account-form-grid">
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
                </div>
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

export default function CuentaPage() {
  return (
    <Suspense
      fallback={
        <main className="account-page-shell">
          <section className="account-loading-card">
            <p>Cargando cuenta…</p>
          </section>
        </main>
      }
    >
      <CuentaPageContent />
    </Suspense>
  );
}
