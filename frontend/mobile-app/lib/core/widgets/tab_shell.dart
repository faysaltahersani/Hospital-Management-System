import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_bottom_nav.dart';

/// Lets any descendant switch tabs — used by the patient home screen's search
/// bar and quick actions.
class TabShellScope extends InheritedWidget {
  const TabShellScope({
    super.key,
    required this.goToTab,
    required this.openInTab,
    required super.child,
  });

  final void Function(String tabKey) goToTab;

  /// Switches to [tabKey] and pushes a route onto *that tab's* navigator, so
  /// the pushed screen keeps the bottom bar and a back press returns to the
  /// tab rather than to wherever the user came from.
  final void Function(String tabKey, WidgetBuilder builder) openInTab;

  static TabShellScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<TabShellScope>();
    assert(scope != null, 'No TabShellScope above this widget.');
    return scope!;
  }

  @override
  bool updateShouldNotify(TabShellScope oldWidget) => false;
}

/// Bottom-tab scaffold where each tab owns a nested [Navigator], so pushing a
/// detail screen keeps the bottom bar visible — matching the prototype, where
/// the nav sat outside the swapped content.
class TabShell extends StatefulWidget {
  const TabShell({
    super.key,
    required this.items,
    required this.rootBuilder,
    this.dark = false,
    this.backgroundColor,
  });

  final List<NavItem> items;

  /// Builds the root screen of the tab identified by `tabKey`.
  final Widget Function(BuildContext context, String tabKey) rootBuilder;

  final bool dark;
  final Color? backgroundColor;

  @override
  State<TabShell> createState() => _TabShellState();
}

class _TabShellState extends State<TabShell> {
  late String _active = widget.items.first.key;

  late final Map<String, GlobalKey<NavigatorState>> _navKeys = {
    for (final item in widget.items) item.key: GlobalKey<NavigatorState>(),
  };

  String get _rootKey => widget.items.first.key;

  void _onTabTapped(String key) {
    if (key == _active) {
      // Re-tapping the current tab returns it to its root screen.
      _navKeys[key]?.currentState?.popUntil((route) => route.isFirst);
      return;
    }
    setState(() => _active = key);
  }

  /// Programmatic tab switch that also resets the tab we are leaving.
  void _goToTab(String key) {
    _navKeys[_active]?.currentState?.popUntil((route) => route.isFirst);
    if (key == _active) return;
    setState(() => _active = key);
  }

  void _openInTab(String key, WidgetBuilder builder) {
    // Every tab's Navigator is already mounted inside the IndexedStack, so the
    // push can happen straight away — no need to wait for the switch to paint.
    final navigator = _navKeys[key]?.currentState;
    _goToTab(key);
    navigator?.push(MaterialPageRoute<void>(builder: builder));
  }

  void _handlePop(bool didPop, Object? result) {
    if (didPop) return;

    final navigator = _navKeys[_active]?.currentState;
    if (navigator != null && navigator.canPop()) {
      navigator.pop();
      return;
    }

    if (_active != _rootKey) {
      setState(() => _active = _rootKey);
      return;
    }

    SystemNavigator.pop();
  }

  @override
  Widget build(BuildContext context) {
    final found = widget.items.indexWhere((item) => item.key == _active);
    final activeIndex = found < 0 ? 0 : found;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: _handlePop,
      child: TabShellScope(
        goToTab: _goToTab,
        openInTab: _openInTab,
        child: Scaffold(
          backgroundColor: widget.backgroundColor,
          // The nav bar is translucent, so content scrolls beneath it. Every
          // tab root pads its scroll view by ~100px at the bottom to match.
          extendBody: true,
          body: IndexedStack(
            index: activeIndex,
            children: [
              for (final item in widget.items)
                Navigator(
                  key: _navKeys[item.key],
                  onGenerateRoute: (settings) => MaterialPageRoute<void>(
                    settings: settings,
                    // Tab roots are plain Columns/ListViews rather than
                    // Scaffolds, so they need this Material ancestor: it paints
                    // the background and satisfies TextField and InkWell.
                    builder: (context) => Material(
                      color: widget.backgroundColor ??
                          Theme.of(context).scaffoldBackgroundColor,
                      child: widget.rootBuilder(context, item.key),
                    ),
                  ),
                ),
            ],
          ),
          bottomNavigationBar: AppBottomNav(
            items: widget.items,
            activeKey: _active,
            onChanged: _onTabTapped,
            dark: widget.dark,
          ),
        ),
      ),
    );
  }
}
