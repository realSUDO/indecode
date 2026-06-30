"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";
import { Loader2, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export default function AdminDashboardPage() {
  const utils = trpc.useUtils();
  const { data: users, isLoading: usersLoading } = trpc.admin.getUsers.useQuery();
  const { data: coupons, isLoading: couponsLoading } = trpc.admin.getCoupons.useQuery();

  const grantPro = trpc.admin.grantPro.useMutation({
    onSuccess: () => {
      toast.success("User upgraded to Pro successfully.");
      utils.admin.getUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grant Pro");
    }
  });

  const createCoupon = trpc.admin.createCoupon.useMutation({
    onSuccess: () => {
      toast.success("Coupon created successfully.");
      utils.admin.getCoupons.invalidate();
      setIsCouponDialogOpen(false);
    }
  });

  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountValue, setDiscountValue] = useState("100");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");

  const handleGrantPro = (userId: string) => {
    if (confirm("Are you sure you want to bypass payment and manually grant Pro status?")) {
      grantPro.mutate({ targetUserId: userId });
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    createCoupon.mutate({
      code: couponCode,
      discountType,
      discountValue: parseInt(discountValue),
    });
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">System Dashboard</h1>
          <p className="text-gray-400">Welcome to the Indecode administration panel.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-300">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {usersLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (users?.length || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-300">Active Pro Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {usersLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (users?.filter(u => u.plan === "pro").length || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 border-rose-500/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-rose-300">Active Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {couponsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (coupons?.filter(c => c.isActive).length || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" /> User Management CRM
          </h2>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-950/50 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Name / Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {usersLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-200">{user.name}</div>
                    <div className="text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-gray-800 text-gray-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.plan === 'pro' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}`}>
                      {user.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.plan !== "pro" && (
                      <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleGrantPro(user.id)} disabled={grantPro.isPending}>
                        Manual Pro Grant
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-rose-400" /> Coupon Engine
          </h2>
          <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rose-600 hover:bg-rose-500 text-white">Create Coupon</Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-950 border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-white">Create Marketing Coupon</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCoupon} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. EARLYBIRD100" className="bg-gray-900 border-gray-700" required />
                </div>
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} min="1" max={discountType === 'percentage' ? "100" : undefined} className="bg-gray-900 border-gray-700" required />
                </div>
                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-500 text-white mt-4" disabled={createCoupon.isPending}>
                  {createCoupon.isPending ? "Creating..." : "Create Coupon"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {couponsLoading ? (
            <div className="text-gray-500 p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : coupons?.map(coupon => (
            <Card key={coupon.id} className="bg-gray-950 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center text-lg">
                  <span className="font-mono text-rose-400">{coupon.code}</span>
                  <span className={`text-xs px-2 py-1 rounded-md ${coupon.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </CardTitle>
                <CardDescription>
                  {coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : '₹'} OFF
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-400">
                  Used: <span className="text-white">{coupon.usedCount}</span> {coupon.maxUses ? `/ ${coupon.maxUses}` : '(Unlimited)'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
