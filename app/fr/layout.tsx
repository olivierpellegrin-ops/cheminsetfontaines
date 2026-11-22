import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function FrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
