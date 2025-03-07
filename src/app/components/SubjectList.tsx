import { Subject, Video } from "@/app/types";

interface SubjectListProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSubjectSelect: (subject: Subject) => void;
  onVideoSelect: (video: Video) => void;
}

export default function SubjectList({
  subjects,
  selectedSubject,
  onSubjectSelect,
  onVideoSelect,
}: SubjectListProps) {
  return (
    <nav
      aria-label="Lista de materias y videos"
      className="bg-white rounded-xl overflow-hidden"
    >
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Materias</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {subjects.map((subject) => (
          <div key={subject.id} className="p-4">
            <button
              onClick={() => onSubjectSelect(subject)}
              className={`w-full text-left font-medium px-3 py-2 rounded-lg transition-colors duration-200 ${
                selectedSubject?.id === subject.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              }`}
              aria-expanded={selectedSubject?.id === subject.id}
              aria-controls={`videos-${subject.id}`}
            >
              <div className="flex items-center">
                <span className="flex-1">{subject.name}</span>
                <svg
                  className={`h-5 w-5 transform transition-transform duration-200 ${
                    selectedSubject?.id === subject.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>
            {selectedSubject?.id === subject.id && (
              <div
                id={`videos-${subject.id}`}
                className="mt-2 space-y-1 pl-2"
                role="region"
                aria-label={`Videos de ${subject.name}`}
              >
                {subject.videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => onVideoSelect(video)}
                    className="group w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className="flex items-center">
                      <svg
                        className="h-4 w-4 text-gray-400 group-hover:text-blue-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 group-hover:text-blue-600">
                        {video.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
