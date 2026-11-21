import { Component } from "react";
import i18n from "@/i18n";

export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-page p-6 text-navy">
          <div role="alert" className="card max-w-md text-center">
            <h1 className="page-title">
              {i18n.t("common:pages.errorBoundaryTitle")}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {i18n.t("common:pages.errorBoundaryMessage")}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary"
              >
                {i18n.t("common:buttons.reload")}
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
