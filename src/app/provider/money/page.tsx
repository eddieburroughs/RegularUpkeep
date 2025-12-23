import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

type CompletedBooking = {
  id: string;
  booking_number: string;
  scheduled_date: string;
  invoice_cents: number;
  total_amount: number;
  actual_end_time: string | null;
  services: { name: string } | null;
};

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const EarningsCard = ({
  title,
  amount,
  icon: Icon,
  description,
}: {
  title: string;
  amount: number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </CardContent>
  </Card>
);

const TransactionRow = ({ booking }: { booking: CompletedBooking }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      </div>
      <div>
        <p className="font-medium text-sm">
          {booking.services?.name || "Service"}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          {" "}#{booking.booking_number}
        </p>
      </div>
    </div>
    <span className="font-semibold text-green-600">
      +{formatCurrency(booking.invoice_cents || booking.total_amount)}
    </span>
  </div>
);

export default async function ProviderMoneyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/money");
  }

  // Get provider
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as { data: { id: string } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Get date ranges
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Fetch completed bookings
  const { data: completedBookings } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, scheduled_date, invoice_cents, total_amount, actual_end_time,
      services(name)
    `)
    .eq("provider_id", provider.id)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: false }) as { data: CompletedBooking[] | null };

  const bookings = completedBookings || [];

  // Calculate earnings
  const getEarnings = (since: Date) => {
    return bookings
      .filter((b) => new Date(b.scheduled_date) >= since)
      .reduce((sum, b) => sum + (b.invoice_cents || b.total_amount || 0), 0);
  };

  const todayEarnings = getEarnings(startOfToday);
  const weekEarnings = getEarnings(startOfWeek);
  const monthEarnings = getEarnings(startOfMonth);
  const yearEarnings = getEarnings(startOfYear);

  // Group bookings by date for display
  const todayBookings = bookings.filter(
    (b) => new Date(b.scheduled_date) >= startOfToday
  );
  const weekBookings = bookings.filter(
    (b) => new Date(b.scheduled_date) >= startOfWeek
  );
  const monthBookings = bookings.filter(
    (b) => new Date(b.scheduled_date) >= startOfMonth
  );

  const completedCount = bookings.length;
  const avgJobValue = completedCount > 0 ? yearEarnings / completedCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground">
          Track your income from completed jobs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <EarningsCard
          title="Today"
          amount={todayEarnings}
          icon={DollarSign}
          description={`${todayBookings.length} jobs`}
        />
        <EarningsCard
          title="This Week"
          amount={weekEarnings}
          icon={Calendar}
          description={`${weekBookings.length} jobs`}
        />
        <EarningsCard
          title="This Month"
          amount={monthEarnings}
          icon={TrendingUp}
          description={`${monthBookings.length} jobs`}
        />
        <EarningsCard
          title="Avg Job Value"
          amount={avgJobValue}
          icon={Clock}
          description={`${completedCount} total jobs`}
        />
      </div>

      {/* Year Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {new Date().getFullYear()} Total Earnings
            </p>
            <p className="text-4xl font-bold text-primary">
              {formatCurrency(yearEarnings)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              from {completedCount} completed jobs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <CardDescription>Your completed job earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="week">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>

            <TabsContent value="today">
              {todayBookings.length > 0 ? (
                <div className="divide-y">
                  {todayBookings.map((booking) => (
                    <TransactionRow key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No earnings today</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="week">
              {weekBookings.length > 0 ? (
                <div className="divide-y">
                  {weekBookings.slice(0, 10).map((booking) => (
                    <TransactionRow key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No earnings this week</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="month">
              {monthBookings.length > 0 ? (
                <div className="divide-y">
                  {monthBookings.slice(0, 20).map((booking) => (
                    <TransactionRow key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No earnings this month</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
