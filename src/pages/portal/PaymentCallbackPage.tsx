import { useEffect, useState } from "react";
import { Link, useRouter } from "../../lib/router";
import { verifyPayment, type ApiPayment } from "../../lib/paymentsApi";
import { Spinner, Badge } from "../../components/ui";
import { formatMoney } from "../../lib/format";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";

type Status = "checking" | "paid" | "failed" | "pending" | "error";

export function PaymentCallbackPage() {
  const { route } = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reference = route.query.get("reference") ?? route.query.get("tx_ref") ?? sessionStorage.getItem("kr_pending_payment_reference");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setError("No payment reference was returned. If you completed checkout, check your payment history in a moment.");
      return;
    }

    let cancelled = false;
    let attempt = 0;

    // The gateway's own webhook is the source of truth and may land a beat after the
    // redirect; poll the API's verify endpoint a few times before giving up.
    const check = async () => {
      attempt += 1;
      try {
        const { payment: p } = await verifyPayment(reference);
        if (cancelled) return;
        setPayment(p);
        if (p.status === "paid") {
          setStatus("paid");
          sessionStorage.removeItem("kr_pending_payment_reference");
        } else if (p.status === "failed") {
          setStatus("failed");
        } else if (attempt < 5) {
          setTimeout(check, 2000);
        } else {
          setStatus("pending");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Could not verify this payment.");
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card p-8 max-w-md w-full text-center">
        {status === "checking" && (
          <>
            <Spinner size={32} className="text-brand-600 mx-auto" />
            <h1 className="mt-4 text-xl font-bold text-ink-950">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-ink-500">This only takes a moment.</p>
          </>
        )}

        {status === "paid" && payment && (
          <>
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-brand-100 text-brand-700">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink-950">Payment successful</h1>
            <p className="mt-2 text-sm text-ink-500">
              {formatMoney(payment.amount, payment.currency)} · <span className="font-mono">{payment.reference}</span>
            </p>
            <Badge tone="brand" className="mt-3">Paid</Badge>
            <Link to="/portal/payments" className="btn-primary mt-6 w-full justify-center">
              View payment history <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}

        {status === "failed" && payment && (
          <>
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink-950">Payment didn't go through</h1>
            <p className="mt-2 text-sm text-ink-500">Nothing was charged. You can try again from where you left off.</p>
            <Link to="/portal/payments" className="btn-secondary mt-6 w-full justify-center">
              Back to payments
            </Link>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-gold-100 text-gold-700">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink-950">Still confirming</h1>
            <p className="mt-2 text-sm text-ink-500">
              Your bank or the payment provider is taking a little longer than usual. This will update automatically — check your payment history shortly.
            </p>
            <Link to="/portal/payments" className="btn-secondary mt-6 w-full justify-center">
              View payment history
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-rose-100 text-rose-700">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink-950">Couldn't confirm this payment</h1>
            <p className="mt-2 text-sm text-ink-500">{error}</p>
            <Link to="/portal/payments" className="btn-secondary mt-6 w-full justify-center">
              View payment history
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
