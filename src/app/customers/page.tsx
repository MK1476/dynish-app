import { redirect } from 'next/navigation';

export default function CustomersRedirect() {
  redirect('/owner/customers');
}
