import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class PatientPayScreen extends StatefulWidget {
  const PatientPayScreen({super.key});

  @override
  State<PatientPayScreen> createState() => _PatientPayScreenState();
}

class _PatientPayScreenState extends State<PatientPayScreen> {
  List<Invoice>? _invoices;
  bool _paying = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final invoices = await context.read<AppSession>().patients.invoices();
    if (mounted) setState(() => _invoices = invoices);
  }

  int get _totalDue => (_invoices ?? const <Invoice>[])
      .where((i) => i.status == InvoiceStatus.due)
      .fold(0, (sum, invoice) => sum + invoice.amount);

  Future<void> _payOne(Invoice invoice) async {
    if (_paying) return;
    setState(() => _paying = true);

    try {
      final updated =
          await context.read<AppSession>().patients.payInvoice(invoice.id);
      if (!mounted) return;
      setState(() => _invoices = updated);
      AppToast.show(context, 'Payment successful — ${invoice.title}');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment failed: $error')),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  Future<void> _payAll() async {
    if (_paying || _totalDue == 0) return;
    setState(() => _paying = true);

    try {
      final updated = await context.read<AppSession>().patients.payAll();
      if (!mounted) return;
      setState(() => _invoices = updated);
      AppToast.show(context, 'All dues cleared');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment failed: $error')),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoices = _invoices;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ScreenHeader(
          title: 'Payments',
          subtitle: 'Settle bills, view invoice history',
        ),
        Expanded(
          child: invoices == null
              ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                  children: [
                    _DuesCard(
                      totalDue: _totalDue,
                      busy: _paying,
                      onPayAll: _payAll,
                    ),
                    const SizedBox(height: 26),
                    if (invoices.isEmpty)
                      const EmptyState('No invoices on your account.'),
                    for (var i = 0; i < invoices.length; i++) ...[
                      _InvoiceRow(
                        invoice: invoices[i],
                        onTap: invoices[i].status == InvoiceStatus.due
                            ? () => _payOne(invoices[i])
                            : null,
                      ),
                      if (i < invoices.length - 1) const SizedBox(height: 12),
                    ],
                  ],
                ),
        ),
      ],
    );
  }
}

class _DuesCard extends StatelessWidget {
  const _DuesCard({
    required this.totalDue,
    required this.busy,
    required this.onPayAll,
  });

  final int totalDue;
  final bool busy;
  final VoidCallback onPayAll;

  @override
  Widget build(BuildContext context) {
    final settled = totalDue == 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: AppRadius.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Total due',
            style: AppTextStyles.body(11, color: AppColors.onNavyMuted),
          ),
          const SizedBox(height: 4),
          Text(
            formatTaka(totalDue),
            style: AppTextStyles.display(26, color: Colors.white),
          ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: busy
                ? 'Processing…'
                : settled
                    ? 'All settled'
                    : 'Pay all now',
            dark: true,
            onPressed: settled || busy ? null : onPayAll,
          ),
        ],
      ),
    );
  }
}

class _InvoiceRow extends StatelessWidget {
  const _InvoiceRow({required this.invoice, required this.onTap});

  final Invoice invoice;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final due = invoice.status == InvoiceStatus.due;

    return ShadowedCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  invoice.title,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 3),
                Text(
                  due
                      ? '${invoice.formattedAmount} · Tap to pay'
                      : invoice.formattedAmount,
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          AppTag(
            invoice.status.label,
            tone: due ? TagTone.coral : TagTone.mint,
          ),
        ],
      ),
    );
  }
}
