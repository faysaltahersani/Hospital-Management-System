import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class FamilyMembersScreen extends StatefulWidget {
  const FamilyMembersScreen({super.key});

  @override
  State<FamilyMembersScreen> createState() => _FamilyMembersScreenState();
}

class _FamilyMembersScreenState extends State<FamilyMembersScreen> {
  final _name = TextEditingController();
  final _relation = TextEditingController();

  List<FamilyMember>? _members;

  @override
  void initState() {
    super.initState();
    context.read<AppSession>().patients.family().then((members) {
      if (mounted) setState(() => _members = members);
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _relation.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final name = _name.text.trim();
    if (name.isEmpty) return;

    final members = await context.read<AppSession>().patients.addFamilyMember(
          name: name,
          relation: _relation.text.trim(),
        );
    if (!mounted) return;

    _name.clear();
    _relation.clear();
    FocusScope.of(context).unfocus();
    setState(() => _members = members);
    AppToast.show(context, 'Family member added');
  }

  Future<void> _remove(FamilyMember member) async {
    final members = await context
        .read<AppSession>()
        .patients
        .removeFamilyMember(member.id);
    if (!mounted) return;
    setState(() => _members = members);
    AppToast.show(context, 'Family member removed');
  }

  @override
  Widget build(BuildContext context) {
    final members = _members;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Family members',
            subtitle: 'Manage profiles you book and pay for',
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: members == null
                ? const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    children: [
                      if (members.isEmpty)
                        const EmptyState('No family members added yet.'),
                      for (final member in members) ...[
                        _MemberRow(
                          member: member,
                          onRemove: () => _remove(member),
                        ),
                        const SizedBox(height: 10),
                      ],
                      const SizedBox(height: 12),
                      ShadowedCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Add a family member',
                              style: AppTextStyles.body(
                                11,
                                color: AppColors.slateLight,
                                weight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 12),
                            UnderlineField(
                              controller: _name,
                              hint: 'Full name',
                              textInputAction: TextInputAction.next,
                            ),
                            const SizedBox(height: 12),
                            UnderlineField(
                              controller: _relation,
                              hint: 'Relation (e.g. Spouse, Son)',
                              textInputAction: TextInputAction.done,
                              onSubmitted: (_) => _add(),
                            ),
                            const SizedBox(height: 18),
                            SoftButton(
                              label: 'Add member',
                              icon: Icons.person_add_alt,
                              onPressed: _add,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.member, required this.onRemove});

  final FamilyMember member;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      radius: AppRadius.row,
      shadow: AppShadows.row,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          const IconChip(
            icon: Icons.person_outline,
            size: 36,
            iconSize: 15,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.name,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  member.relation,
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.delete_outline),
            iconSize: 16,
            color: AppColors.coral,
            tooltip: 'Remove ${member.name}',
          ),
        ],
      ),
    );
  }
}
