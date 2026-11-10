<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Attendance;
use App\Models\CaseFollowup;
use App\Models\ClassAssignment;
use App\Models\Complaint;
use App\Models\ComplaintStatusHistory;
use App\Models\ParentVerificationCode;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // Clear in order
        foreach ([
            'audit_logs', 'telegram_notification_logs', 'parent_students',
            'parent_verification_codes', 'telegram_parents', 'case_followups',
            'complaint_status_histories', 'complaint_attachments', 'complaint_violations',
            'complaints', 'violations', 'attendances', 'class_assignments',
            'students', 'classes', 'school_calendar', 'academic_years', 'personal_access_tokens',
            'users', 'settings',
        ] as $table) {
            if (DB::getSchemaBuilder()->hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ─── Settings ─────────────────────────────────────────────────────────
        Setting::set('school_name', 'SMK IPTEK SANGGABUANA');
        Setting::set('school_address', 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat');
        Setting::set('school_phone', '0812-3456-7890');
        Setting::set('school_email', 'bk@smkiptek.sch.id');
        Setting::set('cutoff_time', '08:00');
        Setting::set('active_academic_year', '2025/2026');

        // ─── Users (Primary SMK IPTEK & Quick Demo) ───────────────────────────
        // 1. Admin Accounts
        $admin = User::create([
            'name'     => 'Administrator SMK IPTEK',
            'email'    => 'admin@smkiptek.sch.id',
            'password' => Hash::make('password'),
            'role'     => 'admin',
            'is_active'=> true,
        ]);

        $adminDemo = User::create([
            'name'     => '[DEMO] Admin Sistem',
            'email'    => 'admin@demo.test',
            'password' => Hash::make('Demo@Admin123'),
            'role'     => 'admin',
            'is_active'=> true,
        ]);

        // 2. Guru BK Accounts
        $guruBk = User::create([
            'name'     => 'Ibu Sari, S.Pd (Guru BK)',
            'email'    => 'gurubk@smkiptek.sch.id',
            'password' => Hash::make('password'),
            'role'     => 'guru_bk',
            'is_active'=> true,
        ]);

        $guruBkDemo = User::create([
            'name'     => '[DEMO] Guru BK - Ibu Sari',
            'email'    => 'guru.bk@demo.test',
            'password' => Hash::make('Demo@GuruBK123'),
            'role'     => 'guru_bk',
            'is_active'=> true,
        ]);

        // 3. Wali Kelas Accounts
        $waliMain = User::create([
            'name'     => 'Bpk. Ahmad (Wali Kelas X RPL 1)',
            'email'    => 'wali@smkiptek.sch.id',
            'password' => Hash::make('password'),
            'role'     => 'wali_kelas',
            'is_active'=> true,
        ]);

        $waliKelas = [];
        $waliNames = [
            'Bpk. Ahmad', 'Ibu Dewi', 'Bpk. Rudi', 'Ibu Rina',
            'Bpk. Yusuf', 'Ibu Fatimah', 'Bpk. Hendra', 'Ibu Laila',
            'Bpk. Tono',
        ];
        foreach ($waliNames as $i => $wn) {
            $waliKelas[] = User::create([
                'name'     => "[DEMO] {$wn}",
                'email'    => 'wali' . ($i + 1) . '@demo.test',
                'password' => Hash::make('Demo@Wali123'),
                'role'     => 'wali_kelas',
                'is_active'=> true,
            ]);
        }

        // 4. Siswa Account
        $siswaUser = User::create([
            'name'     => 'Ahmad Santoso (Siswa)',
            'email'    => 'siswa@smkiptek.sch.id',
            'password' => Hash::make('password'),
            'role'     => 'siswa',
            'is_active'=> true,
        ]);

        // ─── Academic Year ────────────────────────────────────────────────────
        $ay = AcademicYear::create([
            'label'      => '2025/2026',
            'start_date' => '2025-07-14',
            'end_date'   => '2026-06-20',
            'is_active'  => true,
        ]);

        // ─── Classes ─────────────────────────────────────────────────────────
        $classData = [
            ['X', 'X RPL 1'], ['X', 'X RPL 2'], ['X', 'X TKJ 1'],
            ['XI', 'XI RPL 1'], ['XI', 'XI RPL 2'], ['XI', 'XI TKJ 1'],
            ['XII', 'XII RPL 1'], ['XII', 'XII RPL 2'], ['XII', 'XII TKJ 1'],
        ];

        $classes = [];
        foreach ($classData as $i => [$grade, $name]) {
            $classes[] = SchoolClass::create([
                'academic_year_id' => $ay->id,
                'name'             => $name,
                'grade_level'      => $grade,
                'is_active'        => true,
            ]);
        }

        // ─── Assign Wali Kelas ────────────────────────────────────────────────
        foreach ($classes as $i => $class) {
            // Assign primary wali user to class 0
            if ($i === 0) {
                ClassAssignment::create([
                    'class_id'        => $class->id,
                    'user_id'         => $waliMain->id,
                    'assignment_role' => 'wali_kelas',
                    'assigned_at'     => now(),
                ]);
            }

            ClassAssignment::create([
                'class_id'        => $class->id,
                'user_id'         => $waliKelas[$i]->id,
                'assignment_role' => 'wali_kelas',
                'assigned_at'     => now(),
            ]);
        }

        // ─── Students (30 per class = 270 total) ─────────────────────────────
        $maleNames   = ['Ahmad','Budi','Deni','Fajar','Gilang','Hendra','Irfan','Joko','Kevin','Lutfi'];
        $femaleNames = ['Aisyah','Bella','Cindy','Dina','Eva','Fira','Gita','Hana','Indah','Juwita'];
        $surnames    = ['Santoso','Wijaya','Kusuma','Pratama','Saputra','Hidayat','Purnama','Rahmat','Setiawan','Nugraha','Rahman','Utama'];

        $students = [];
        $nisCounter = 10002;
        foreach ($classes as $classIdx => $class) {
            for ($j = 0; $j < 30; $j++) {
                // First student has special NIS 2026001 for Telegram verification demo
                if ($classIdx === 0 && $j === 0) {
                    $nis = '2026001';
                    $fullName = 'Ahmad Santoso';
                    $gender = 'L';
                } else {
                    $nis = (string) $nisCounter++;
                    $gender = ($j % 2 === 0) ? 'L' : 'P';
                    $firstName = $gender === 'L'
                        ? $maleNames[$j % count($maleNames)]
                        : $femaleNames[$j % count($femaleNames)];
                    $lastName  = $surnames[($j + $classIdx) % count($surnames)];
                    $fullName = "{$firstName} {$lastName}";
                }

                $students[] = Student::create([
                    'nis'               => $nis,
                    'name'              => $fullName,
                    'gender'            => $gender,
                    'birth_date'        => Carbon::create(2007, rand(1, 12), rand(1, 28)),
                    'class_id'          => $class->id,
                    'enrollment_status' => 'aktif',
                ]);
            }
        }

        // ─── Parent Verification Codes ────────────────────────────────────────
        // Special code for NIS 2026001: DEMO123
        ParentVerificationCode::create([
            'student_id'     => $students[0]->id,
            'code_hash'      => Hash::make('DEMO123'),
            'plain_code'     => 'DEMO123',
            'expires_at'     => now()->addMonths(6),
            'issued_by'      => $admin->id,
            'attempts_count' => 0,
        ]);

        // Also generate active codes for the first 10 students
        for ($k = 1; $k < 10; $k++) {
            $code = strtoupper(Str::random(6));
            ParentVerificationCode::create([
                'student_id'     => $students[$k]->id,
                'code_hash'      => Hash::make($code),
                'plain_code'     => $code,
                'expires_at'     => now()->addMonths(3),
                'issued_by'      => $admin->id,
                'attempts_count' => 0,
            ]);
        }

        // ─── Violations ───────────────────────────────────────────────────────
        $violations = [];
        $violationData = [
            ['name' => 'Terlambat masuk kelas', 'points' => 5],
            ['name' => 'Tidak membawa atribut lengkap', 'points' => 10],
            ['name' => 'Membolos / tidak hadir tanpa keterangan', 'points' => 20],
            ['name' => 'Membawa HP tanpa izin', 'points' => 15],
            ['name' => 'Perkelahian / tindak kekerasan', 'points' => 50],
            ['name' => 'Merokok di lingkungan sekolah', 'points' => 40],
            ['name' => 'Merusak fasilitas sekolah', 'points' => 30],
        ];
        foreach ($violationData as $vd) {
            $violations[] = Violation::create(array_merge($vd, ['created_by' => $admin->id]));
        }

        // ─── Attendance (past 30 days) ────────────────────────────────────────
        $statuses = ['Hadir', 'Hadir', 'Hadir', 'Hadir', 'Hadir', 'Sakit', 'Izin', 'Alpa'];
        $sampleStudents = array_slice($students, 0, 60);
        for ($d = 1; $d <= 30; $d++) {
            $date = Carbon::today()->subDays($d);
            if ($date->isWeekend()) continue;
            foreach ($sampleStudents as $s) {
                Attendance::create([
                    'student_id'  => $s->id,
                    'class_id'    => $s->class_id,
                    'date'        => $date->toDateString(),
                    'status'      => $statuses[array_rand($statuses)],
                    'recorded_by' => $admin->id,
                ]);
            }
        }

        // ─── Sample Complaints ────────────────────────────────────────────────
        foreach (array_slice($students, 0, 5) as $i => $s) {
            $complaint = Complaint::create([
                'complaint_code'      => 'BK-2025-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'student_id'          => $s->id,
                'class_id'            => $s->class_id,
                'reported_by_user_id' => $guruBk->id,
                'chronology'          => 'Siswa dilaporkan melakukan pelanggaran tata tertib sekolah pada hari ' . now()->subDays($i * 3)->format('d M Y') . '. Kejadian ini diketahui oleh guru piket dan dilaporkan ke BK.',
                'incident_at'         => now()->subDays($i * 3),
                'status'              => ['Pending', 'Diproses', 'Selesai', 'Pending', 'Diproses'][$i],
                'assigned_to'         => $guruBk->id,
                'parent_visible'      => $i % 2 === 0,
            ]);

            ComplaintStatusHistory::create([
                'complaint_id' => $complaint->id,
                'changed_by'   => $guruBk->id,
                'old_status'   => null,
                'new_status'   => 'Pending',
                'note'         => 'Pengaduan dibuat.',
            ]);

            if ($complaint->status !== 'Pending') {
                ComplaintStatusHistory::create([
                    'complaint_id' => $complaint->id,
                    'changed_by'   => $guruBk->id,
                    'old_status'   => 'Pending',
                    'new_status'   => $complaint->status,
                    'note'         => 'Kasus sedang diproses.',
                ]);
            }

            // Attach violation
            if (isset($violations[0])) {
                DB::table('complaint_violations')->insert([
                    'complaint_id'   => $complaint->id,
                    'violation_id'   => $violations[$i % count($violations)]->id,
                    'points_snapshot'=> $violations[$i % count($violations)]->points,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            if ($complaint->status === 'Diproses') {
                CaseFollowup::create([
                    'complaint_id'   => $complaint->id,
                    'user_id'        => $guruBk->id,
                    'followup_type'  => 'konseling',
                    'notes'          => 'Telah dilakukan sesi konseling dengan siswa. Siswa mengakui kesalahan dan berjanji tidak akan mengulangi.',
                    'parent_visible' => true,
                    'followed_up_at' => now()->subDay(),
                ]);
            }
        }

        $this->command->info('✅ Seeder selesai!');
        $this->command->info('');
        $this->command->info('AKUN DEMO UTAMA (SMK IPTEK SANGGABUANA):');
        $this->command->info('  Admin      : admin@smkiptek.sch.id / password');
        $this->command->info('  Guru BK    : gurubk@smkiptek.sch.id / password');
        $this->command->info('  Wali Kelas : wali@smkiptek.sch.id / password');
        $this->command->info('  Siswa      : siswa@smkiptek.sch.id / password');
        $this->command->info('');
        $this->command->info('AKUN DEMO CADANGAN:');
        $this->command->info('  Admin      : admin@demo.test / Demo@Admin123');
        $this->command->info('  Guru BK    : guru.bk@demo.test / Demo@GuruBK123');
        $this->command->info('  Wali Kelas : wali1@demo.test ... wali9@demo.test / Demo@Wali123');
        $this->command->info('');
        $this->command->info('Total siswa : ' . count($students));
        $this->command->info('Total kelas : ' . count($classes));
        $this->command->info('Demo Telegram: NIS 2026001 / Kode DEMO123');
    }
}
