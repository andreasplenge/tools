import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Portfolio analytics</h1>
        <p className="text-xl text-muted-foreground">Insights & performance metrics</p>
        <nav className="mt-8">
          <Link
            to="/analytics"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Analytics
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default Index;
