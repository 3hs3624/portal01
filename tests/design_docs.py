"""Design coverage checks reject missing docs without changing product behavior."""
import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('design_guard',ROOT/'scripts/check_design_docs.py');guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)

inventory_spec=importlib.util.spec_from_file_location('design_inventory',ROOT/'scripts/design_inventory.py');inventory=importlib.util.module_from_spec(inventory_spec);inventory_spec.loader.exec_module(inventory)

class InventoryExtraction(unittest.TestCase):
 def test_static_fields_labels_and_options(self):
  parser=inventory.Controls();parser.feed('<label for="name">이름</label><input id="name" required><select id="sort"><option value="recent">최근 수정</option><option value="name">이름순</option></select>');rows=parser.result()
  self.assertEqual(rows[0]['label'],'이름');self.assertEqual(rows[0]['attributes']['required'],'true');self.assertEqual(rows[1]['options'],[{'value':'recent','label':'최근 수정'},{'value':'name','label':'이름순'}])
 def test_script_templates_are_not_static_controls_and_textarea_body_is_omitted(self):
  parser=inventory.Controls();parser.feed('<script>const html="<button>dynamic</button>";</script><button id="save">저장</button><textarea aria-label="초기 SQL">select 1;</textarea>');rows=parser.result()
  self.assertEqual(len(rows),2);self.assertEqual(rows[0]['label'],'저장');self.assertEqual(rows[1]['text'],'');self.assertGreater(rows[1]['initialContentLength'],0)

class DesignCoverage(unittest.TestCase):
 def test_apps_map_to_separate_designs(self):
  for app,doc in guard.APP_DOCS.items():self.assertEqual(guard.required_documents('apps/'+app+'/app.js','old','new'),{'docs/design/'+doc})
 def test_common_schema_and_desktop(self):
  self.assertEqual(guard.required_documents('sharing.css','old','new'),{'docs/design/common.md'})
  self.assertEqual(guard.required_documents('supabase/migrations/change.sql','old','new'),{'docs/design/common.md'})
  self.assertEqual(guard.required_documents('desktop/src/main.cjs','old','new'),{'docs/design/desktop.md'})
 def test_configuration_and_desktop_workflow_require_docs(self):
  self.assertEqual(guard.required_documents('modules.json','old','new'),{'docs/design/common.md'})
  self.assertEqual(guard.required_documents('desktop/package.json','old','new'),{'docs/design/desktop.md'})
  self.assertEqual(guard.required_documents('.github/workflows/desktop-preview.yml','old','new'),{'docs/design/desktop.md'})
 def test_cache_only_changes_are_ignored(self):
  self.assertEqual(guard.required_documents('apps/markdown/index.html','<script src="app.js?v=abcdef123456">','<script src="app.js?v=012345abcdef">'),set())
  self.assertEqual(guard.required_documents('app.js','const appPageVersions={"markdown":"abcdef123456"};','const appPageVersions={"markdown":"012345abcdef"};'),set())
 def test_real_ui_change_alongside_cache_is_detected(self):
  self.assertEqual(guard.required_documents('apps/markdown/index.html','<button>old</button>','<button>new</button>'),{'docs/design/write-studio.md'})
 def test_docs_tests_and_vendor_do_not_force_feature_updates(self):
  for path in ['docs/design/common.md','tests/example.py','apps/markdown/vendor/example.js','scripts/design_inventory.py','desktop/README.md']:
   self.assertEqual(guard.required_documents(path,'old','new'),set())
 def test_changelog_and_relevant_doc_both_required(self):
  required={'docs/design/write-studio.md'}
  self.assertEqual(guard.missing_documents(['docs/design/CHANGELOG.md'],required),required)
  self.assertEqual(guard.missing_documents(['docs/design/write-studio.md'],required),{'docs/design/CHANGELOG.md'})
  self.assertEqual(guard.missing_documents([*required,'docs/design/CHANGELOG.md'],required),set())

if __name__=='__main__':unittest.main()
