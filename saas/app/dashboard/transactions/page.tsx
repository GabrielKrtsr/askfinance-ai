import { getTransactions } from "@/lib/data/transactions";
import { TransactionsTable } from "@/components/dashboard/transactions-table";

export default async function TransactionsPage() {
  const { transactions, categories } = await getTransactions();

  return (
    <TransactionsTable transactions={transactions} categories={categories} />
  );
}
